/**
 * Represents a single change in the part count for a machine.
 */
interface CycleTimeChange {
  timestamp: Date;
  count: number;
}

/**
 * Stores the history of part count changes for a single machine
 * to calculate cycle times and statuses.
 */
interface CycleTimeHistory {
  machineId: string;
  /** A deque of recent part count changes to calculate a rolling average cycle time. */
  changes: CycleTimeChange[];
}

/**
 * Represents the calculated state of a machine.
 */
export interface MachineState {
  cycleTimeMs?: number;
  partsInCycle: number;
  confidence: 'Stable' | 'Unstable' | 'No Data' | 'Stopped' | 'Waiting';
  isAnomalous: boolean;
  machineStatus: 'ACTIVE' | 'IDLE';
  idleTimeMinutes: number;
}

/**
 * Calculates machine cycle time, status (ACTIVE/IDLE), and idle duration
 * based on part count changes over time using a rolling window approach.
 */
export class CycleTimeCalculator {
  private histories: Map<string, CycleTimeHistory> = new Map();
  private restoredIdleTimes: Map<string, number> = new Map();
  private lastLoggedStatus: Map<string, string> = new Map(); // Track last logged status to avoid spam
  
  private readonly IDLE_TIMEOUT_MINUTES = 5;
  /** The number of change intervals to average over. 6 changes = 5 intervals. */
  private readonly MIN_CHANGES_FOR_STABLE_AVG = 6; 

  public getCycleTime(machineId: string, currentCount: number, currentTimestamp: Date, executionStatus?: string): MachineState {
    if (!this.histories.has(machineId)) {
      return this.handleNewMachine(machineId, currentCount, currentTimestamp);
    }

    const history = this.histories.get(machineId)!;
    const lastChange = history.changes[history.changes.length - 1];
    const delta = currentCount - lastChange.count;

    if (delta > 0) {
      history.changes.push({ timestamp: currentTimestamp, count: currentCount });
      if (history.changes.length > this.MIN_CHANGES_FOR_STABLE_AVG) {
        history.changes.shift();
      }
      return this.recalculateState(history, delta);
    } else if (delta < 0) {
      return this.handleCountReset(machineId, currentCount, currentTimestamp);
    } else {
      return this.handleNoChange(history, currentTimestamp, executionStatus);
    }
  }

  public restoreIdleTime(machineId: string, idleTimeMinutes: number) {
    this.restoredIdleTimes.set(machineId, idleTimeMinutes);
    console.log(`[CycleTimeCalculator] ${machineId}: Restored idle time set to ${idleTimeMinutes} min from cache.`);
  }

  /**
   * Initializes a machine's history. Sets initial status to IDLE.
   */
  private handleNewMachine(machineId: string, currentCount: number, currentTimestamp: Date): MachineState {
    const history: CycleTimeHistory = {
      machineId,
      changes: [{ timestamp: currentTimestamp, count: currentCount }],
    };
    this.histories.set(machineId, history);

    const restoredIdleTime = this.restoredIdleTimes.get(machineId) || 0;
    console.log(`[CycleTime] ${machineId}: New machine detected. Initial count: ${currentCount}. Status: IDLE`);
    // A new machine is always considered IDLE until it starts producing.
    return this.createMachineState(history, 'No Data', 'IDLE', restoredIdleTime);
  }

  private handleCountReset(machineId: string, currentCount: number, currentTimestamp: Date): MachineState {
    console.log(`[CycleTime] ${machineId}: Part count reset detected. Restarting history.`);
    return this.handleNewMachine(machineId, currentCount, currentTimestamp);
  }

  /**
   * Recalculates the machine's state based on its history of changes.
   * Cycle time is only calculated when enough data is available.
   */
  private recalculateState(history: CycleTimeHistory, partsInLastCycle: number): MachineState {
    this.restoredIdleTimes.delete(history.machineId);

    // We need at least 2 changes to calculate one interval.
    if (history.changes.length < 2) {
      return this.createMachineState(history, 'Unstable', 'ACTIVE', 0);
    }

    const firstChange = history.changes[0];
    const lastChange = history.changes[history.changes.length - 1];

    const totalTimeMs = lastChange.timestamp.getTime() - firstChange.timestamp.getTime();
    const totalParts = lastChange.count - firstChange.count;

    // Do not calculate if time or parts are zero/negative.
    if (totalTimeMs <= 0 || totalParts <= 0) {
      return this.createMachineState(history, 'Unstable', 'ACTIVE', 0);
    }

    // Check if we have enough data for a STABLE calculation.
    if (history.changes.length < this.MIN_CHANGES_FOR_STABLE_AVG) {
      const confidence = 'Unstable';
      // Only log once when transitioning to production
      this.logStatusChange(history.machineId, `${confidence} production started. Collecting data (${history.changes.length}/${this.MIN_CHANGES_FOR_STABLE_AVG})`);
      return this.createMachineState(history, confidence, 'ACTIVE', 0, undefined, partsInLastCycle);
    }

    const averageCycleTimeMs = totalTimeMs / totalParts;
    const confidence = 'Stable';
    
    // Log stable cycle time calculation
    this.logStatusChange(history.machineId, `${confidence} production. Cycle time: ${(averageCycleTimeMs / 1000).toFixed(1)}s (${totalParts} parts)`);
    
    return this.createMachineState(history, confidence, 'ACTIVE', 0, averageCycleTimeMs, partsInLastCycle);
  }

  private handleNoChange(history: CycleTimeHistory, currentTimestamp: Date, executionStatus?: string): MachineState {
    const lastChange = history.changes[history.changes.length - 1];
    const timeSinceLastChangeMs = currentTimestamp.getTime() - lastChange.timestamp.getTime();
    const minutesSinceLastChange = timeSinceLastChangeMs / (1000 * 60);

    const restoredIdleTime = this.restoredIdleTimes.get(history.machineId) || 0;
    const totalIdleTime = Math.round(minutesSinceLastChange + restoredIdleTime);
    
    // Determine the last known state before deciding on the current one.
    const lastKnownState = this.getLastKnownState(history);

    if (executionStatus && executionStatus !== 'ACTIVE') {
      this.logStatusChange(history.machineId, `IDLE detected (${executionStatus}). Total idle: ${totalIdleTime} min`);
      return this.createMachineState(history, 'Stopped', 'IDLE', totalIdleTime, lastKnownState.cycleTimeMs);
    }

    if (minutesSinceLastChange > this.IDLE_TIMEOUT_MINUTES) {
      this.logStatusChange(history.machineId, `IDLE detected (timeout). Total idle: ${totalIdleTime} min`);
      return this.createMachineState(history, 'Stopped', 'IDLE', totalIdleTime, lastKnownState.cycleTimeMs);
    }
    
    // While waiting, the machine is still considered ACTIVE - no need to log every time
    return this.createMachineState(history, lastKnownState.confidence, 'ACTIVE', 0, lastKnownState.cycleTimeMs);
  }

  /**
   * Logs status changes only when they actually change to reduce log spam
   */
  private logStatusChange(machineId: string, message: string): void {
    const lastMessage = this.lastLoggedStatus.get(machineId);
    if (lastMessage !== message) {
      console.log(`[CycleTime] ${machineId}: ${message}`);
      this.lastLoggedStatus.set(machineId, message);
    }
  }

  private createMachineState(
    history: CycleTimeHistory,
    confidence: MachineState['confidence'],
    machineStatus: MachineState['machineStatus'],
    idleTimeMinutes: number,
    cycleTimeMs?: number,
    partsInCycle: number = 0
  ): MachineState {
        return {
      cycleTimeMs,
      partsInCycle,
      confidence,
        isAnomalous: false,
      machineStatus,
      idleTimeMinutes,
    };
  }

  /**
   * Calculates the last known cycle time from the available history.
   * Returns a minimal state object with the last known cycle time and confidence.
   */
  private getLastKnownState(history: CycleTimeHistory): { cycleTimeMs?: number; confidence: MachineState['confidence'] } {
    if (history.changes.length < this.MIN_CHANGES_FOR_STABLE_AVG) {
        return { cycleTimeMs: undefined, confidence: 'Unstable' };
    }

    const firstChange = history.changes[0];
    const lastChange = history.changes[history.changes.length - 1];
    const totalTimeMs = lastChange.timestamp.getTime() - firstChange.timestamp.getTime();
    const totalParts = lastChange.count - firstChange.count;

    if (totalParts > 0) {
      return { cycleTimeMs: totalTimeMs / totalParts, confidence: 'Stable' };
    }
    
    return { cycleTimeMs: undefined, confidence: 'Unstable' };
  }


  public getCycleTimeData(machineId: string): MachineState | undefined {
    const history = this.histories.get(machineId);
    if (!history) {
      return undefined;
    }
    // Return the last known state, defaulting to IDLE if no production has occurred.
    const lastState = this.getLastKnownState(history);
    return this.createMachineState(history, lastState.confidence, 'IDLE', 0, lastState.cycleTimeMs);
  }
}