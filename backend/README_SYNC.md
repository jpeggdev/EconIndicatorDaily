# Data Synchronization System

## Overview
The EconIndicatorDaily platform includes a robust background worker system that automatically syncs data from multiple economic data sources on configurable schedules.

## Architecture
- **CLI Script**: Manual data synchronization with flexible options
- **Background Worker**: Automated cron-based scheduling system
- **REST API**: Control and monitor sync operations

## CLI Usage

### Basic Commands
```bash
# Sync all indicators
npx ts-node src/cli/syncData.ts

# Check sync status
npx ts-node src/cli/syncData.ts status

# Show help
npx ts-node src/cli/syncData.ts help
```

### Advanced Options
```bash
# Sync specific data source
npx ts-node src/cli/syncData.ts --source bls --verbose

# Sync specific indicators
npx ts-node src/cli/syncData.ts --indicators "Unemployment Rate,Consumer Price Index"

# Dry run (preview without syncing)
npx ts-node src/cli/syncData.ts --dry-run --verbose

# Force sync (ignore cache)
npx ts-node src/cli/syncData.ts --force
```

## Background Worker

### Automatic Schedules
- **FRED Data**: Every 2 hours during business hours (6 AM - 8 PM ET, Mon-Fri)
- **Alpha Vantage**: Every 30 minutes during market hours (9:30 AM - 4 PM ET, Mon-Fri)
- **BLS Data**: Once daily at 8:30 AM ET (typical BLS release time)
- **World Bank**: Once weekly on Sunday at 2 AM ET
- **Full Sync**: Once daily at 6 AM ET (backup)

### API Endpoints
```bash
# Get worker status
GET /api/sync/status

# Trigger manual sync
POST /api/sync/trigger
Content-Type: application/json
{"source": "bls"}

# Start/stop worker
POST /api/sync/start
POST /api/sync/stop
```

## Features
- Smart caching with frequency-based update intervals
- Rate limiting and retry logic with exponential backoff
- Comprehensive error handling and logging
- Dry run capabilities for testing
- Source-specific and indicator-specific filtering
- Real-time status monitoring

## Data Sources
- **FRED**: Federal Reserve Economic Data (10 indicators)
- **Alpha Vantage**: Market data (5 ETFs)
- **BLS**: Bureau of Labor Statistics (9 indicators)
- **World Bank**: Global economic indicators (5 indicators)

The system automatically starts when the Express server launches and runs continuously in the background.