import { BlsService } from '../services/blsService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugBlsApi() {
  console.log('🔍 Debugging BLS API Integration...\n');

  const blsApiKey = process.env.BLS_API_KEY;
  console.log(`BLS API Key present: ${blsApiKey ? 'Yes' : 'No'}`);
  console.log(`BLS API Key: ${blsApiKey?.substring(0, 8)}...${blsApiKey?.substring(-4)}\n`);

  if (!blsApiKey) {
    console.error('❌ BLS_API_KEY not found in environment variables');
    return;
  }

  const blsService = new BlsService(blsApiKey);
  
  try {
    console.log('📊 Testing BLS API with simple unemployment rate request...\n');
    
    // Test with unemployment rate series
    const testSeriesId = 'LNS14000000'; // Unemployment Rate
    console.log(`Requesting series: ${testSeriesId}`);
    
    const result = await blsService.getSeriesData([testSeriesId], '2023', '2024');
    
    console.log(`Raw API response data points: ${result.length}`);
    
    if (result.length > 0) {
      console.log('\n✅ Sample data points:');
      result.slice(0, 5).forEach((point, index) => {
        console.log(`${index + 1}. Date: ${point.date}, Value: ${point.value}, Period: ${point.period} (${point.periodName})`);
      });
    } else {
      console.log('⚠️  No data points returned');
    }

    // Test with multiple series
    console.log('\n📈 Testing multiple series request...');
    const multipleResult = await blsService.getCPIComponents('2023', '2024');
    console.log(`Multiple series data points: ${multipleResult.length}`);

    if (multipleResult.length > 0) {
      // Group by series ID
      const groupedData = multipleResult.reduce((acc, item) => {
        if (!acc[item.seriesId]) acc[item.seriesId] = [];
        acc[item.seriesId].push(item);
        return acc;
      }, {} as Record<string, any[]>);

      console.log('\n📊 Data by series:');
      Object.entries(groupedData).forEach(([seriesId, data]) => {
        console.log(`${seriesId}: ${data.length} points, latest: ${data[0]?.value} (${data[0]?.date})`);
      });
    }

  } catch (error) {
    console.error('❌ BLS API Error:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      if ('response' in error) {
        console.error('Response data:', (error as any).response?.data);
      }
    }
  }
}

// Run if called directly
if (require.main === module) {
  debugBlsApi();
}

export { debugBlsApi };