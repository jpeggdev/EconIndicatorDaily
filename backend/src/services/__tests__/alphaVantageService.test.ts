import axios from 'axios';
import { AlphaVantageService } from '../alphaVantageService';
import { AlphaVantageTimeSeriesResponse, AlphaVantageGlobalQuoteResponse } from '../../types/alphaVantage';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AlphaVantageService', () => {
  let service: AlphaVantageService;
  const testApiKey = 'test-api-key-12345';

  beforeEach(() => {
    service = new AlphaVantageService(testApiKey);
    jest.clearAllMocks();
  });

  describe('Security Tests', () => {
    it('should not expose API key in error messages', async () => {
      // Mock setTimeout to avoid actual delays
      (global as any).setTimeout = jest.fn((callback) => callback());
      
      mockedAxios.get.mockRejectedValueOnce(new Error('API Error'));

      // Use getMultipleQuotes which has error logging
      await service.getMultipleQuotes(['SPY']);

      // Verify API key is not logged in console
      expect(console.error).toHaveBeenCalled();
      const errorCalls = (console.error as jest.Mock).mock.calls;
      const allErrorMessages = errorCalls.flat().join(' ');
      expect(allErrorMessages).not.toContain(testApiKey);
    });

    it('should not expose API key in thrown error messages', async () => {
      const invalidResponse = { data: {} };
      mockedAxios.get.mockResolvedValueOnce(invalidResponse);

      try {
        await service.getDailyAdjusted('INVALID');
      } catch (error: any) {
        expect(error.message).not.toContain(testApiKey);
        expect(error.toString()).not.toContain(testApiKey);
      }
    });

    it('should include API key in request parameters but not in responses', async () => {
      const mockResponse: AlphaVantageTimeSeriesResponse = {
        'Meta Data': {
          '1. Information': 'Daily Prices',
          '2. Symbol': 'SPY',
          '3. Last Refreshed': '2023-12-01',
          '4. Output Size': 'Compact',
          '5. Time Zone': 'US/Eastern'
        },
        'Time Series (Daily)': {
          '2023-12-01': {
            '1. open': '100.00',
            '2. high': '101.00',
            '3. low': '99.00',
            '4. close': '100.50',
            '5. volume': '1000000'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await service.getDailyAdjusted('SPY');

      // Verify API key was sent in request
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.alphavantage.co/query',
        expect.objectContaining({
          params: expect.objectContaining({
            apikey: testApiKey
          })
        })
      );
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should implement delay between multiple quote requests', async () => {
      const mockQuote = {
        'Global Quote': {
          '01. symbol': 'SPY',
          '02. open': '100.00',
          '03. high': '101.00',
          '04. low': '99.00',
          '05. price': '100.50',
          '06. volume': '1000000',
          '07. latest trading day': '2023-12-01',
          '08. previous close': '100.00',
          '09. change': '0.50',
          '10. change percent': '0.50%'
        }
      };

      mockedAxios.get.mockResolvedValue({ data: mockQuote });

      // Mock setTimeout to track delays
      const originalSetTimeout = global.setTimeout;
      const mockSetTimeout = jest.fn((callback, delay) => {
        callback();
        return 1 as any;
      });
      (global as any).setTimeout = mockSetTimeout;

      const startTime = Date.now();
      await service.getMultipleQuotes(['SPY', 'QQQ']);
      const endTime = Date.now();

      // Should have called setTimeout for delay between requests
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 12000);

      global.setTimeout = originalSetTimeout;
    });

    it('should continue processing other symbols if one fails', async () => {
      const mockQuote = {
        'Global Quote': {
          '01. symbol': 'SPY',
          '02. open': '100.00',
          '03. high': '101.00',
          '04. low': '99.00',
          '05. price': '100.50',
          '06. volume': '1000000',
          '07. latest trading day': '2023-12-01',
          '08. previous close': '100.00',
          '09. change': '0.50',
          '10. change percent': '0.50%'
        }
      };

      // First call fails, second succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({ data: mockQuote });

      // Mock setTimeout to avoid actual delays
      (global as any).setTimeout = jest.fn((callback) => callback());

      const results = await service.getMultipleQuotes(['INVALID', 'SPY']);

      expect(results).toHaveLength(1);
      expect(results[0].symbol).toBe('SPY');
      expect(console.error).toHaveBeenCalledWith(
        'Failed to fetch quote for INVALID:',
        expect.any(Error)
      );
    });
  });

  describe('Data Validation Tests', () => {
    it('should validate and parse daily adjusted data correctly', async () => {
      const mockResponse: AlphaVantageTimeSeriesResponse = {
        'Meta Data': {
          '1. Information': 'Daily Prices',
          '2. Symbol': 'SPY',
          '3. Last Refreshed': '2023-12-01',
          '4. Output Size': 'Compact',
          '5. Time Zone': 'US/Eastern'
        },
        'Time Series (Daily)': {
          '2023-12-01': {
            '1. open': '100.00',
            '2. high': '101.00',
            '3. low': '99.00',
            '4. close': '100.50',
            '5. volume': '1000000'
          },
          '2023-11-30': {
            '1. open': '99.50',
            '2. high': '100.25',
            '3. low': '99.00',
            '4. close': '100.00',
            '5. volume': '900000'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.getDailyAdjusted('SPY', 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        symbol: 'SPY',
        date: '2023-12-01',
        open: 100.00,
        high: 101.00,
        low: 99.00,
        close: 100.50,
        adjustedClose: 100.50,
        volume: 1000000
      });
    });

    it('should handle invalid or missing time series data', async () => {
      const mockResponse = {
        'Meta Data': {
          '1. Information': 'Daily Prices',
          '2. Symbol': 'SPY',
          '3. Last Refreshed': '2023-12-01',
          '4. Output Size': 'Compact',
          '5. Time Zone': 'US/Eastern'
        }
        // Missing 'Time Series (Daily)' field
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(service.getDailyAdjusted('SPY')).rejects.toThrow(
        'No data found for symbol: SPY'
      );
    });

    it('should handle malformed quote data gracefully', async () => {
      const mockResponse = {
        // Missing 'Global Quote' field
        'Error Message': 'Invalid API call'
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await expect(service.getGlobalQuote('INVALID')).rejects.toThrow(
        'No quote data found for symbol: INVALID'
      );
    });

    it('should parse global quote data correctly', async () => {
      const mockQuoteResponse: AlphaVantageGlobalQuoteResponse = {
        'Global Quote': {
          '01. symbol': 'SPY',
          '02. open': '100.00',
          '03. high': '101.00',
          '04. low': '99.00',
          '05. price': '100.50',
          '06. volume': '1000000',
          '07. latest trading day': '2023-12-01',
          '08. previous close': '100.00',
          '09. change': '0.50',
          '10. change percent': '0.50%'
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuoteResponse });

      const result = await service.getGlobalQuote('SPY');

      expect(result).toEqual({
        symbol: 'SPY',
        date: '2023-12-01',
        open: 100.00,
        high: 101.00,
        low: 99.00,
        close: 100.50,
        adjustedClose: 100.50,
        volume: 1000000,
        change: 0.50,
        changePercent: 0.50
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      
      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(service.getDailyAdjusted('SPY')).rejects.toThrow('Network Error');
    });

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Request failed with status code 429');
      (rateLimitError as any).response = {
        status: 429,
        data: {
          'Error Message': 'API rate limit exceeded'
        }
      };

      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(service.getGlobalQuote('SPY')).rejects.toThrow('Request failed with status code 429');
    });

    it('should handle invalid API key errors without exposing the key', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            'Error Message': 'Invalid API key'
          }
        }
      };

      mockedAxios.get.mockRejectedValueOnce(authError);

      try {
        await service.getDailyAdjusted('SPY');
      } catch (error: any) {
        expect(error.toString()).not.toContain(testApiKey);
      }
    });
  });

  describe('Request Parameter Tests', () => {
    it('should send correct parameters for daily adjusted data', async () => {
      const mockResponse: AlphaVantageTimeSeriesResponse = {
        'Meta Data': {
          '1. Information': 'Daily Prices',
          '2. Symbol': 'SPY',
          '3. Last Refreshed': '2023-12-01',
          '4. Output Size': 'Compact',
          '5. Time Zone': 'US/Eastern'
        },
        'Time Series (Daily)': {
          '2023-12-01': {
            '1. open': '100.00',
            '2. high': '101.00',
            '3. low': '99.00',
            '4. close': '100.50',
            '5. volume': '1000000'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await service.getDailyAdjusted('SPY');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.alphavantage.co/query',
        {
          params: {
            function: 'TIME_SERIES_DAILY',
            symbol: 'SPY',
            apikey: testApiKey,
            outputsize: 'compact'
          }
        }
      );
    });

    it('should send correct parameters for global quote', async () => {
      const mockQuoteResponse: AlphaVantageGlobalQuoteResponse = {
        'Global Quote': {
          '01. symbol': 'SPY',
          '02. open': '100.00',
          '03. high': '101.00',
          '04. low': '99.00',
          '05. price': '100.50',
          '06. volume': '1000000',
          '07. latest trading day': '2023-12-01',
          '08. previous close': '100.00',
          '09. change': '0.50',
          '10. change percent': '0.50%'
        }
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockQuoteResponse });

      await service.getGlobalQuote('QQQ');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://www.alphavantage.co/query',
        {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: 'QQQ',
            apikey: testApiKey
          }
        }
      );
    });
  });
});