import axios from 'axios';

interface YahooAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface YahooFantasyLeague {
  league_key: string;
  league_id: string;
  name: string;
  season: string;
  sport: string;
}

interface YahooFantasyPlayer {
  player_key: string;
  player_id: string;
  name: {
    full: string;
    first: string;
    last: string;
  };
  position_type: string;
  primary_position: string;
}

export class YahooService {
  private clientId: string;
  private clientSecret: string;
  private accessToken?: string;
  private baseURL = 'https://api.login.yahoo.com/oauth2';
  private fantasyBaseURL = 'https://fantasysports.yahooapis.com/fantasy/v2';

  constructor() {
    this.clientId = process.env.YAHOO_CLIENT_KEY || '';
    this.clientSecret = process.env.YAHOO_CLIENT_SECRET || '';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('Yahoo API credentials not found. Yahoo service will be disabled.');
    }
  }

  /**
   * Get OAuth authorization URL for user authentication
   * This is primarily for user authentication and Fantasy Sports access
   */
  getAuthorizationUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile email fantasysports',
      ...(state && { state })
    });

    return `${this.baseURL}/request_auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(authCode: string, redirectUri: string): Promise<YahooAuthResponse> {
    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(`${this.baseURL}/get_token`, 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: authCode,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      return response.data;
    } catch (error) {
      console.error('Error getting Yahoo access token:', error);
      throw new Error('Failed to authenticate with Yahoo');
    }
  }

  /**
   * Get user's fantasy sports leagues
   * Useful for understanding market sentiment through fantasy sports data
   */
  async getFantasyLeagues(userKey?: string): Promise<YahooFantasyLeague[]> {
    if (!this.accessToken) {
      throw new Error('No access token available. User must authenticate first.');
    }

    try {
      const url = userKey 
        ? `${this.fantasyBaseURL}/users;use_login=1/games;game_keys=nfl,mlb,nba,nhl/leagues`
        : `${this.fantasyBaseURL}/users;use_login=1/games/leagues`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });

      // Parse Yahoo's XML-like response structure
      return this.parseFantasyLeagues(response.data);
    } catch (error) {
      console.error('Error fetching fantasy leagues:', error);
      throw new Error('Failed to fetch fantasy leagues');
    }
  }

  /**
   * Get fantasy players for market sentiment analysis
   * Can be used to analyze which stocks/companies are popular in fantasy contexts
   */
  async getFantasyPlayers(leagueKey: string): Promise<YahooFantasyPlayer[]> {
    if (!this.accessToken) {
      throw new Error('No access token available. User must authenticate first.');
    }

    try {
      const response = await axios.get(
        `${this.fantasyBaseURL}/league/${leagueKey}/players`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
          }
        }
      );

      return this.parseFantasyPlayers(response.data);
    } catch (error) {
      console.error('Error fetching fantasy players:', error);
      throw new Error('Failed to fetch fantasy players');
    }
  }

  /**
   * Sign in with Yahoo - get user profile information
   */
  async getUserProfile(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No access token available. User must authenticate first.');
    }

    try {
      const response = await axios.get('https://api.login.yahoo.com/openid/v1/userinfo', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Validate if Yahoo service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Get service status for monitoring
   */
  getStatus() {
    return {
      service: 'Yahoo',
      configured: this.isConfigured(),
      hasAccessToken: !!this.accessToken,
      capabilities: [
        'User Authentication (Sign in with Yahoo)',
        'Fantasy Sports Data',
        'User Profile Information'
      ]
    };
  }

  private parseFantasyLeagues(data: any): YahooFantasyLeague[] {
    // Yahoo API returns XML-like structure that needs parsing
    // This is a simplified parser - real implementation would be more robust
    if (data.fantasy_content?.users?.user?.games?.game) {
      const games = Array.isArray(data.fantasy_content.users.user.games.game) 
        ? data.fantasy_content.users.user.games.game 
        : [data.fantasy_content.users.user.games.game];
      
      const leagues: YahooFantasyLeague[] = [];
      games.forEach((game: any) => {
        if (game.leagues?.league) {
          const gameLeagues = Array.isArray(game.leagues.league) 
            ? game.leagues.league 
            : [game.leagues.league];
          
          gameLeagues.forEach((league: any) => {
            leagues.push({
              league_key: league.league_key,
              league_id: league.league_id,
              name: league.name,
              season: league.season,
              sport: game.game_key.split('.')[0]
            });
          });
        }
      });
      return leagues;
    }
    return [];
  }

  private parseFantasyPlayers(data: any): YahooFantasyPlayer[] {
    // Simplified parser for fantasy players
    if (data.fantasy_content?.league?.players?.player) {
      const players = Array.isArray(data.fantasy_content.league.players.player)
        ? data.fantasy_content.league.players.player
        : [data.fantasy_content.league.players.player];
      
      return players.map((player: any) => ({
        player_key: player.player_key,
        player_id: player.player_id,
        name: {
          full: player.name.full,
          first: player.name.first,
          last: player.name.last
        },
        position_type: player.position_type,
        primary_position: player.primary_position
      }));
    }
    return [];
  }
}

export default YahooService;