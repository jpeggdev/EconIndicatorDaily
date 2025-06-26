import axios from 'axios';
import { BlsService } from '../blsService';
import { BlsApiResponse } from '../../types/bls';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BlsService - Security and Core Functionality', () => {
  let service: BlsService;
  const testApiKey = 'test-bls-api-key-67890';

  beforeEach(() => {
    service = new BlsService(testApiKey);
    jest.clearAllMocks();
  });

  describe('Security Tests', () => {
    it('should not expose API key in console logs during errors', async () => {
      const networkError = new Error('Network error');
      mockedAxios.post.mockRejectedValueOnce(networkError);

      await expect(service.getSeriesData(['LNS14000000'])).rejects.toThrow();

      // Verify API key is not logged in console
      expect(console.error).toHaveBeenCalledWith('BLS API request failed:', networkError);
      const errorCalls = (console.error as jest.Mock).mock.calls;
      const allErrorMessages = errorCalls.flat().join(' ');
      expect(allErrorMessages).not.toContain(testApiKey);
    });

    it('should include API key in request body but not expose it', async () => {
      const mockResponse: BlsApiResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 150,
        message: [],
        Results: {
          series: [{
            seriesID: 'LNS14000000',
            data: [{
              year: '2023',
              period: 'M12',
              periodName: 'December',
              latest: 'true',
              value: '3.7',
              footnotes: []
            }]
          }]
        }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await service.getSeriesData(['LNS14000000']);

      // Verify API key was sent in request body
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        expect.objectContaining({
          registrationkey: testApiKey
        }),
        expect.any(Object)
      );
    });

    it('should not expose API key in thrown error messages', async () => {
      const errorResponse: BlsApiResponse = {
        status: 'REQUEST_NOT_PROCESSED',
        responseTime: 100,
        message: ['Series does not exist'],
        Results: { series: [] }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: errorResponse });

      try {
        await service.getSeriesData(['INVALID_SERIES']);
      } catch (error: any) {
        expect(error.message).not.toContain(testApiKey);
        expect(error.toString()).not.toContain(testApiKey);
      }
    });
  });

  describe('Data Validation Tests', () => {
    it('should validate and process BLS data correctly', async () => {
      const mockResponse: BlsApiResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 150,
        message: [],
        Results: {
          series: [{
            seriesID: 'LNS14000000',
            data: [
              {
                year: '2023',
                period: 'M12',
                periodName: 'December',
                latest: 'true',
                value: '3.7',
                footnotes: [{ code: 'P', text: 'Preliminary' }]
              },
              {
                year: '2023',
                period: 'M11',
                periodName: 'November',
                latest: 'false',
                value: '3.8',
                footnotes: []
              }
            ]
          }]
        }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.getSeriesData(['LNS14000000']);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        seriesId: 'LNS14000000',
        date: '2023-12-01',
        value: 3.7,
        period: 'M12',
        periodName: 'December',
        footnotes: ['Preliminary']
      });
    });

    it('should filter out invalid data points', async () => {
      const mockResponse: BlsApiResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 150,
        message: [],
        Results: {
          series: [{
            seriesID: 'LNS14000000',
            data: [
              {
                year: '2023',
                period: 'M12',
                periodName: 'December',
                latest: 'true',
                value: '3.7',
                footnotes: []
              },
              {
                year: '2023',
                period: 'M11',
                periodName: 'November',
                latest: 'false',
                value: '-', // Invalid value
                footnotes: []
              },
              {
                year: '2023',
                period: 'M10',
                periodName: 'October',
                latest: 'false',
                value: '', // Empty value
                footnotes: []
              }
            ]
          }]
        }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.getSeriesData(['LNS14000000']);

      // Should only include valid data points
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(3.7);
    });

    it('should handle different period formats correctly', async () => {
      const mockResponse: BlsApiResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 150,
        message: [],
        Results: {
          series: [{
            seriesID: 'GDP',
            data: [
              {
                year: '2023',
                period: 'Q04',
                periodName: 'Q4',
                latest: 'true',
                value: '100.0',
                footnotes: []
              },
              {
                year: '2023',
                period: 'A01',
                periodName: 'Annual',
                latest: 'false',
                value: '99.5',
                footnotes: []
              }
            ]
          }]
        }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.getSeriesData(['GDP']);

      expect(result).toHaveLength(2);
      expect(result[0].date).toBe('2023-10-01'); // Q4
      expect(result[1].date).toBe('2023-01-01'); // Annual
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle BLS API errors gracefully', async () => {
      const errorResponse: BlsApiResponse = {
        status: 'REQUEST_NOT_PROCESSED',
        responseTime: 100,
        message: ['Series does not exist', 'Invalid series ID'],
        Results: { series: [] }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: errorResponse });

      await expect(service.getSeriesData(['INVALID_SERIES'])).rejects.toThrow(
        'BLS API Error: Series does not exist, Invalid series ID'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout');
      mockedAxios.post.mockRejectedValueOnce(networkError);

      await expect(service.getSeriesData(['LNS14000000'])).rejects.toThrow('Network timeout');

      expect(console.error).toHaveBeenCalledWith('BLS API request failed:', networkError);
    });
  });

  describe('Request Parameter Tests', () => {
    it('should send correct default parameters', async () => {
      const mockResponse: BlsApiResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 150,
        message: [],
        Results: { series: [] }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const currentYear = new Date().getFullYear();
      await service.getSeriesData(['LNS14000000']);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        {
          seriesid: ['LNS14000000'],
          startyear: (currentYear - 5).toString(),
          endyear: currentYear.toString(),
          registrationkey: testApiKey
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should send custom year range when provided', async () => {
      const mockResponse: BlsApiResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 150,
        message: [],
        Results: { series: [] }
      };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      await service.getSeriesData(['LNS14000000'], '2020', '2023');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        {
          seriesid: ['LNS14000000'],
          startyear: '2020',
          endyear: '2023',
          registrationkey: testApiKey
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });

  describe('Convenience Methods Tests', () => {
    beforeEach(() => {
      const mockResponse: BlsApiResponse = {
        status: 'REQUEST_SUCCEEDED',
        responseTime: 150,
        message: [],
        Results: {
          series: [{
            seriesID: 'TEST_SERIES',
            data: [{
              year: '2023',
              period: 'M12',
              periodName: 'December',
              latest: 'true',
              value: '3.7',
              footnotes: []
            }]
          }]
        }
      };
      mockedAxios.post.mockResolvedValue({ data: mockResponse });
    });

    it('should call unemployment rate with correct series ID', async () => {
      await service.getUnemploymentRate();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          seriesid: ['LNS14000000']
        }),
        expect.any(Object)
      );
    });

    it('should call CPI with correct series ID', async () => {
      await service.getCPI();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          seriesid: ['CUUR0000SA0']
        }),
        expect.any(Object)
      );
    });
  });
});