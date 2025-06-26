// @ts-nocheck
import { Router, Request, Response } from 'express';
import YahooService from '../services/yahooService';

const router = Router();
const yahooService = new YahooService();

/**
 * GET /api/yahoo/status
 * Check Yahoo service configuration and status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = yahooService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting Yahoo service status:', error);
    res.status(500).json({ error: 'Failed to get Yahoo service status' });
  }
});

/**
 * GET /api/yahoo/auth/url
 * Get Yahoo OAuth authorization URL for user authentication
 */
router.get('/auth/url', (req: Request, res: Response) => {
  try {
    if (!yahooService.isConfigured()) {
      return res.status(400).json({ 
        error: 'Yahoo service not configured. Missing client credentials.' 
      });
    }

    const redirectUri = req.query.redirect_uri as string || `${process.env.FRONTEND_URL}/auth/yahoo/callback`;
    const state = req.query.state as string;
    
    const authUrl = yahooService.getAuthorizationUrl(redirectUri, state);
    
    res.json({
      authorizationUrl: authUrl,
      redirectUri,
      scope: 'openid profile email fantasysports'
    });
  } catch (error) {
    console.error('Error generating Yahoo auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * POST /api/yahoo/auth/token
 * Exchange authorization code for access token
 */
router.post('/auth/token', async (req: Request, res: Response) => {
  try {
    const { code, redirect_uri } = req.body;
    
    if (!code || !redirect_uri) {
      return res.status(400).json({ 
        error: 'Missing required parameters: code and redirect_uri' 
      });
    }

    const tokenData = await yahooService.getAccessToken(code, redirect_uri);
    
    res.json({
      access_token: tokenData.access_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope
    });
  } catch (error) {
    console.error('Error exchanging Yahoo auth code:', error);
    res.status(500).json({ error: 'Failed to exchange authorization code' });
  }
});

/**
 * GET /api/yahoo/profile
 * Get authenticated user's Yahoo profile
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const profile = await yahooService.getUserProfile();
    res.json(profile);
  } catch (error) {
    console.error('Error fetching Yahoo profile:', error);
    res.status(401).json({ error: 'Authentication required or expired' });
  }
});

/**
 * GET /api/yahoo/fantasy/leagues
 * Get user's fantasy sports leagues
 */
router.get('/fantasy/leagues', async (req: Request, res: Response) => {
  try {
    const leagues = await yahooService.getFantasyLeagues();
    res.json({
      leagues,
      count: leagues.length,
      sports: [...new Set(leagues.map(l => l.sport))]
    });
  } catch (error) {
    console.error('Error fetching Yahoo fantasy leagues:', error);
    res.status(401).json({ error: 'Authentication required or failed to fetch leagues' });
  }
});

/**
 * GET /api/yahoo/fantasy/leagues/:leagueKey/players
 * Get players for a specific fantasy league
 */
router.get('/fantasy/leagues/:leagueKey/players', async (req: Request, res: Response) => {
  try {
    const { leagueKey } = req.params;
    const players = await yahooService.getFantasyPlayers(leagueKey);
    
    res.json({
      leagueKey,
      players,
      count: players.length,
      positions: [...new Set(players.map(p => p.primary_position))]
    });
  } catch (error) {
    console.error('Error fetching Yahoo fantasy players:', error);
    res.status(401).json({ error: 'Authentication required or failed to fetch players' });
  }
});

export default router;