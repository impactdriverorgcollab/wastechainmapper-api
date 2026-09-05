import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private service: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Platform-wide KPI summary — sites, flows, tonnage, anomalies' })
  summary() {
    return this.service.platformSummary();
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Weighted point data for waste generation heatmap visualization' })
  heatmap(@Query('lga') lga?: string) {
    return this.service.heatmapData(lga);
  }

  @Get('flow-timeline')
  @ApiOperation({ summary: 'Waste flow records with origin/destination for timeline playback' })
  flowTimeline(
    @Query('lga') lga?: string,
    @Query('days') days?: string,
  ) {
    return this.service.flowTimeline(lga, days ? parseInt(days, 10) : 30);
  }

  @Get('benchmark')
  @ApiOperation({ summary: 'LGA-level contractor performance benchmarking' })
  benchmark() {
    return this.service.benchmarkByLga();
  }

  @Get('recyclables')
  @ApiOperation({ summary: 'Recyclables tonnage by waste type — market intelligence feed' })
  recyclables(@Query('lga') lga?: string) {
    return this.service.recyclablesTonnage(lga);
  }
}
