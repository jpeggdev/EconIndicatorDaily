import axios from 'axios';
import { FredService } from '../fredService';
import { FredApiResponse, FredSeriesInfo } from '../../types/fred';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('FredService - Security and Core Functionality', () => {
  let service: FredService;
  const testApiKey = 'test-fred-api-key-abcdef';

  beforeEach(() => {
    service = new FredService(testApiKey);
    jest.clearAllMocks();
  });

  describe('Security Tests', () => {
    it('should not expose API key in error messages when service throws', async () => {
      const networkError = new Error('ECONNRESET');
      mockedAxios.get.mockRejectedValueOnce(networkError);

      try {
        await service.getSeriesObservations('UNRATE');
      } catch (error: any) {
        expect(error.message).not.toContain(testApiKey);
        expect(error.toString()).not.toContain(testApiKey);
      }
    });

    it('should include API key in request parameters', async () => {
      const mockResponse: FredApiResponse = {
        realtime_start: '2023-12-01',
        realtime_end: '2023-12-01',
        observation_start: '1948-01-01',
        observation_end: '2023-12-01',
        units: 'lin',
        output_type: 1,
        file_type: 'json',
        order_by: 'observation_date',
        sort_order: 'desc',
        count: 1,
        offset: 0,
        limit: 100,
        observations: [{
          realtime_start: '2023-12-01',
          realtime_end: '2023-12-01',
          date: '2023-11-01',
          value: '3.9'
        }]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      await service.getSeriesObservations('UNRATE');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.stlouisfed.org/fred/series/observations',
        {
          params: {
            series_id: 'UNRATE',
            api_key: testApiKey,
            file_type: 'json',
            limit: 100,
            sort_order: 'desc'
          }
        }
      );
    });

    it('should handle invalid API key without exposing it', async () => {
      const authError = new Error('Bad Request');
      (authError as any).response = {
        status: 400,
        data: {
          error_code: 400,
          error_message: 'The value for variable api_key is not registered.'
        }
      };

      mockedAxios.get.mockRejectedValueOnce(authError);

      try {
        await service.getSeriesObservations('UNRATE');
      } catch (error: any) {
        expect(error.toString()).not.toContain(testApiKey);
      }
    });
  });

  describe('Data Validation Tests', () => {
    it('should fetch and return series observations correctly', async () => {
      const mockResponse: FredApiResponse = {
        realtime_start: '2023-12-01',
        realtime_end: '2023-12-01',
        observation_start: '1948-01-01',
        observation_end: '2023-12-01',
        units: 'lin',
        output_type: 1,
        file_type: 'json',
        order_by: 'observation_date',
        sort_order: 'desc',
        count: 2,
        offset: 0,
        limit: 100,
        observations: [
          {
            realtime_start: '2023-12-01',
            realtime_end: '2023-12-01',
            date: '2023-11-01',
            value: '3.9'
          },
          {
            realtime_start: '2023-12-01',
            realtime_end: '2023-12-01',
            date: '2023-10-01',
            value: '3.8'
          }
        ]
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.getSeriesObservations('UNRATE');

      expect(result).toEqual(mockResponse);
      expect(result.observations).toHaveLength(2);
      expect(result.observations[0].value).toBe('3.9');
    });

    it('should handle empty observations array', async () => {
      const mockResponse: FredApiResponse = {
        realtime_start: '2023-12-01',
        realtime_end: '2023-12-01',
        observation_start: '1948-01-01',
        observation_end: '2023-12-01',
        units: 'lin',
        output_type: 1,
        file_type: 'json',
        order_by: 'observation_date',
        sort_order: 'desc',
        count: 0,
        offset: 0,
        limit: 100,
        observations: []
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await service.getSeriesObservations('NONEXISTENT');

      expect(result.observations).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('ECONNRESET');
      networkError.name = 'NetworkError';

      mockedAxios.get.mockRejectedValueOnce(networkError);

      await expect(service.getSeriesObservations('UNRATE')).rejects.toThrow('ECONNRESET');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Too Many Requests');
      (rateLimitError as any).response = {
        status: 429,
        data: {
          error_code: 429,
          error_message: 'API rate limit exceeded'
        }
      };

      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(service.getSeriesObservations('UNRATE')).rejects.toThrow('Too Many Requests');
    });
  });

  describe('Request Parameter Tests', () => {
    beforeEach(() => {
      const mockResponse: FredApiResponse = {
        realtime_start: '2023-12-01',
        realtime_end: '2023-12-01',
        observation_start: '1948-01-01',
        observation_end: '2023-12-01',
        units: 'lin',
        output_type: 1,
        file_type: 'json',
        order_by: 'observation_date',
        sort_order: 'desc',
        count: 0,
        offset: 0,
        limit: 100,
        observations: []
      };
      mockedAxios.get.mockResolvedValue({ data: mockResponse });
    });

    it('should send correct parameters with custom limit', async () => {
      await service.getSeriesObservations('UNRATE', 50);

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.stlouisfed.org/fred/series/observations',
        {
          params: {
            series_id: 'UNRATE',
            api_key: testApiKey,
            file_type: 'json',
            limit: 50,
            sort_order: 'desc'
          }
        }
      );
    });

    it('should send correct parameters for series info', async () => {
      const mockSeriesResponse = {
        seriess: [{
          id: 'UNRATE',
          title: 'Unemployment Rate'
        }]
      };
      mockedAxios.get.mockResolvedValueOnce({ data: mockSeriesResponse });

      await service.getSeriesInfo('UNRATE');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.stlouisfed.org/fred/series',
        {
          params: {
            series_id: 'UNRATE',
            api_key: testApiKey,
            file_type: 'json'
          }
        }
      );
    });
  });
});