import { randomUUID } from 'node:crypto';
import { db } from './client.js';
import { env } from '../env.js';

const instanceId = randomUUID();
let heartbeatTimer: NodeJS.Timeout | null = null;
let acquiredGuildId: string | null = null;
let heartbeatInFlight = false;
let lastSuccessfulHeartbeatAt = 0;
let consecutiveFailures = 0;
let ownershipLost = false;
let ownershipLostHandler: ((reason:string)=>void|Promise<void>) | null = null;

export type InstanceLockHealth = {held:boolean;lastSuccessfulHeartbeatAt:number;consecutiveFailures:number;ownershipLost:boolean};
export function setInstanceLockLostHandler(handler:(reason:string)=>void|Promise<void>){ownershipLostHandler=handler;}
async function signalOwnershipLost(reason:string){
  if(ownershipLost)return;ownershipLost=true;
  console.error(`Instance lock lost: ${reason}`);
  try{await ownershipLostHandler?.(reason);}catch(error){console.error('Instance lock lost handler failed:',error);}
}
async function heartbeat(guildId:string){
  if(heartbeatInFlight||ownershipLost)return;heartbeatInFlight=true;
  try{
    const now=Date.now();
    const result=await db.execute({sql:'UPDATE instance_locks SET heartbeat_at = ? WHERE guild_id = ? AND instance_id = ?',args:[now,guildId,instanceId]});
    if(result.rowsAffected===0){await signalOwnershipLost('database lease is owned by another instance');return;}
    lastSuccessfulHeartbeatAt=now;consecutiveFailures=0;
  }catch(error){
    consecutiveFailures++;
    console.error('Instance heartbeat failed:',error);
    if(lastSuccessfulHeartbeatAt>0 && Date.now()-lastSuccessfulHeartbeatAt>=env.instanceLockTtlMs){
      await signalOwnershipLost(`database heartbeat unavailable for ${Math.round((Date.now()-lastSuccessfulHeartbeatAt)/1000)}s`);
    }
  }finally{heartbeatInFlight=false;}
}

export async function acquireInstanceLock(guildId: string): Promise<{ ok: true; instanceId: string } | { ok: false; activeInstanceId: string; heartbeatAt: number }> {
  const now = Date.now();
  const staleBefore = now - env.instanceLockTtlMs;
  await db.execute({
    sql: `INSERT INTO instance_locks(guild_id, instance_id, heartbeat_at)
          VALUES(?, ?, ?)
          ON CONFLICT(guild_id) DO UPDATE SET
            instance_id = excluded.instance_id,
            heartbeat_at = excluded.heartbeat_at
          WHERE instance_locks.instance_id = excluded.instance_id
             OR instance_locks.heartbeat_at < ?`,
    args: [guildId, instanceId, now, staleBefore]
  });
  const row = (await db.execute({sql:'SELECT instance_id, heartbeat_at FROM instance_locks WHERE guild_id = ?', args:[guildId]})).rows[0];
  if (row && String(row.instance_id) === instanceId) {
    acquiredGuildId = guildId;lastSuccessfulHeartbeatAt=now;consecutiveFailures=0;ownershipLost=false;
    heartbeatTimer = setInterval(() => { void heartbeat(guildId); }, env.instanceHeartbeatMs);
    heartbeatTimer.unref();
    return { ok: true, instanceId };
  }
  return { ok: false, activeInstanceId: String(row?.instance_id ?? 'unknown'), heartbeatAt: Number(row?.heartbeat_at ?? 0) };
}

export async function releaseInstanceLock(): Promise<void> {
  if (heartbeatTimer) clearInterval(heartbeatTimer);heartbeatTimer=null;
  if (!acquiredGuildId) return;
  const guildId=acquiredGuildId;acquiredGuildId=null;
  await db.execute({sql:'DELETE FROM instance_locks WHERE guild_id = ? AND instance_id = ?',args:[guildId,instanceId]}).catch((error)=>console.error('Failed to release instance lock:',error));
}
export function getInstanceId():string{return instanceId;}
export function getInstanceLockHealth():InstanceLockHealth{return {held:!!acquiredGuildId&&!ownershipLost,lastSuccessfulHeartbeatAt,consecutiveFailures,ownershipLost};}
