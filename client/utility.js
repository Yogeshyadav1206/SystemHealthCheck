import os from 'os';
import { execSync } from 'child_process';
import fs from 'fs';
import fetch from 'node-fetch';
import { setInterval } from 'timers';

const MACHINE_ID = os.hostname();
const API_URL = 'http://localhost:8000/report';
const STATE_FILE = './last_state.json';

function getDiskEncryption() {
  try {
    const platform = os.platform();
    if (platform === 'win32') {
      const result = execSync('manage-bde -status C:').toString();
      return result.includes('Percentage Encrypted: 100%');
    } else if (platform === 'darwin') {
      const result = execSync('fdesetup status').toString();
      return result.includes('FileVault is On');
    } else {
      const result = execSync('lsblk -o NAME,TYPE').toString();
      return result.includes('crypt');
    }
  } catch (error) {
    console.error('Error checking disk encryption:', error);
    return false;
  }
}

function getOSUpdateStatus() {
  try {
    const platform = os.platform();
    if (platform === 'win32') {
      const result = execSync(
        'powershell "(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn"'
      ).toString().trim();
      return { status: 'Unknown', lastUpdate: result };
    } else if (platform === 'darwin') {
      const result = execSync('softwareupdate --list').toString();
      const needsUpdate = result.includes('*');
      return { status: needsUpdate ? 'Outdated' : 'Up to date' };
    } else {
      const updates = execSync('apt list --upgradable 2>/dev/null | grep -v "Listing..."').toString().trim();
      return { status: updates.length > 0 ? 'Outdated' : 'Up to date' };
    }
  } catch (e) {
    console.error('Error checking OS update status:', e);
    return { status: 'Error' };
  }
}

function getAntivirusStatus() {
  try {
    const platform = os.platform();
    if (platform === 'win32') {
      const result = execSync(
        'powershell "Get-MpComputerStatus | Select-Object -ExpandProperty AntivirusEnabled"'
      ).toString().trim();
      return result === 'True' ? 'Running' : 'Not running';
    } else {
      const psOutput = execSync('ps aux').toString();
      const avProcesses = ['clamd', 'freshclam', 'savd', 'sophos'];
      for (let proc of avProcesses) {
        if (psOutput.includes(proc)) return 'Running';
      }
      return 'Not running';
    }
  } catch (e) {
    console.error('Error checking antivirus status:', e);
    return 'Unknown';
  }
}

function getSleepTimeout() {
  try {
    const platform = os.platform();
    if (platform === 'win32') {
      const result = execSync('powercfg -q').toString();
      const sleepMatch = result.match(/AC Setting Index: 0x([0-9a-f]+)/i);
      if (sleepMatch) {
        const seconds = parseInt(sleepMatch[1], 16);
        const minutes = Math.floor(seconds / 60);
        return minutes <= 10 ? minutes : 'Too long';
      }
    } else if (platform === 'darwin') {
      const result = execSync('pmset -g custom').toString();
      const match = result.match(/sleep\s+(\d+)/);
      if (match) {
        const minutes = parseInt(match[1]);
        return minutes <= 10 ? minutes : 'Too long';
      }
    } else {
      const result = execSync(
        'gsettings get org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout'
      ).toString();
      const seconds = parseInt(result);
      const minutes = seconds / 60;
      return minutes <= 10 ? minutes : 'Too long';
    }
  } catch (e) {
    console.error('Error checking sleep timeout:', e);
    return 'Unknown';
  }
}

function getStatus() {
  return {
    machine_id: MACHINE_ID,
    platform: os.platform(),
    disk_encryption: getDiskEncryption(),
    os_update: getOSUpdateStatus(),
    antivirus_status: getAntivirusStatus(),
    sleep_timeout: getSleepTimeout()
  };
}

function sendStatusIfChanged() {
  const newStatus = getStatus();
  const timestamp = new Date().toISOString();
  console.log(`\nNew status at ${timestamp}:`, newStatus);

  let lastState = {};

  if (fs.existsSync(STATE_FILE)) {
    try {
      lastState = JSON.parse(fs.readFileSync(STATE_FILE));
      console.log('Last state:', lastState);
    } catch (error) {
      console.error('Error reading last state:', error);
    }
  } else {
    console.log('No previous state found.');
  }

  if (JSON.stringify(newStatus) !== JSON.stringify(lastState)) {
    console.log('State changed, sending update...');
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newStatus, timestamp })
    })
      .then(res => res.json())
      .then(response => console.log('Server response:', response))
      .catch(error => console.error('Fetch error:', error));

    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(newStatus));
      console.log('State saved locally.');
    } catch (error) {
      console.error('Error writing state file:', error);
    }
  } else {
    console.log('No changes detected, skipping send.');
  }
}
sendStatusIfChanged();
setInterval(sendStatusIfChanged, 150000);