import fs from 'fs';
import path from 'path';

const srcDir = 'e:/Realtynow_new/src/pages/agent';
const agentFile = path.join(srcDir, 'agent.tsx');

const content = fs.readFileSync(agentFile, 'utf-8');

// The imports are roughly from line 1 to 60.
const importMatch = content.match(/^([\s\S]*?)export function/);
const imports = importMatch ? importMatch[1] : '';

const components = [
  { name: 'AgentDashboard', file: 'dashboard.tsx' },
  { name: 'AgentProperties', file: 'properties.tsx' },
  { name: 'AgentLeads', file: 'leads.tsx' },
  { name: 'AgentAppointments', file: 'appointments.tsx' },
  { name: 'AgentAnalytics', file: 'analytics.tsx' },
  { name: 'AgentSettings', file: 'settings.tsx' },
];

for (let i = 0; i < components.length; i++) {
  const current = components[i];
  const next = components[i + 1];

  const startRegex = new RegExp(`export function ${current.name}\\(\\) {`);
  const match = content.match(startRegex);
  
  if (!match) {
    console.error(`Could not find ${current.name}`);
    continue;
  }
  
  const startIndex = match.index;
  let endIndex = content.length;
  
  if (next) {
    const nextMatch = content.match(new RegExp(`export function ${next.name}\\(\\) {`));
    if (nextMatch) {
      endIndex = nextMatch.index;
    }
  }

  const componentContent = content.substring(startIndex, endIndex);
  
  fs.writeFileSync(path.join(srcDir, current.file), imports + componentContent);
  console.log(`Wrote ${current.file}`);
}
