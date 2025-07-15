import { Controller, Get, Param, Query } from '@nestjs/common';
import { CycleAnalysisService, CycleInfo } from '../services/cycle-analysis.service';
import { MachineStateService, MachineState } from '../services/machine-state.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly cycleAnalysisService: CycleAnalysisService,
    private readonly machineStateService: MachineStateService,
  ) {}

  @Get(':machineId/cycles')
  async getCycles(
    @Param('machineId') machineId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<CycleInfo[]> {
    console.log(`[AnalyticsController] Received request for cycles for machine: ${machineId}`);
    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000); // default to last 24 hours
    const toDate = to ? new Date(to) : new Date();
    console.log(`[AnalyticsController] Date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    return this.cycleAnalysisService.analyzeCycles(machineId, fromDate, toDate);
  }

  @Get(':machineId/state')
  async getMachineState(
    @Param('machineId') machineId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<MachineState> {
    console.log(`[AnalyticsController] Received request for state for machine: ${machineId}`);
    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000); // default to last 24 hours
    const toDate = to ? new Date(to) : new Date();
    console.log(`[AnalyticsController] Date range: ${fromDate.toISOString()} to ${toDate.toISOString()}`);
    return this.machineStateService.getMachineState(machineId, fromDate, toDate);
  }
}
