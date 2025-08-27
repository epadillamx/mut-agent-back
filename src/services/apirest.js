export class FracttalService {
  constructor(fracttalKey, fracttalSecret, baseUrl = 'https://app.fracttal.com/api') {
    this.FRACTTAL_KEY = fracttalKey;
    this.FRACTTAL_SECRET = fracttalSecret;
    this.baseUrl = baseUrl;
    this.authUrl = 'https://one.fracttal.com/oauth/token';

    // Simulación de almacenamiento de token (en memoria)
    this.tokenStorage = {
      accessToken: null,
      refreshToken: null,
      tokenType: null,
      expiresAt: null
    };
  }

  // Método de logging simple
  log(message) {
    console.log(`[FracttalService] ${message}`);
  }

  error(message, errorData) {
    console.error(`[FracttalService] ${message}`, errorData);
  }

  // Método principal para crear work request
  async createWorkRequest(payload) {
    console.log(payload);

    const token = await this.getValidToken();


    try {
      const response = await fetch(`${this.baseUrl}/work_requests/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      return data;

    } catch (error) {
      this.error(`Error al crear la solicitud de trabajo para ${payload.code}:`, error.message);
      throw new Error(`Falló la creación de la solicitud de trabajo.`);
    }
  }

  // Método para obtener token válido
  async getValidToken() {

    const clientId = this.FRACTTAL_KEY;
    const clientSecret = this.FRACTTAL_SECRET;

    // Crear credenciales en base64
    const credentials = btoa(`${clientId}:${clientSecret}`);

    try {
      // Preparar el body para x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');

      const response = await fetch(this.authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        },
        body: params.toString()
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();

      const { access_token, refresh_token, token_type, expires_in } = data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Guardar token en memoria
      this.tokenStorage = {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type,
        expiresAt: expiresAt
      };

      return access_token;

    } catch (error) {
      this.error('[AUTH-NEW] Error crítico al obtener token:', error.message);
      throw new Error('No se pudo autenticar con la API de Fracttal.');
    }
  }

  // Método para verificar si el token es válido
  isTokenValid() {
    if (!this.tokenStorage.accessToken || !this.tokenStorage.expiresAt) {
      return false;
    }

    return new Date() < this.tokenStorage.expiresAt;
  }

  // Método mejorado que reutiliza token si es válido
  async getValidTokenOptimized() {
    if (this.isTokenValid()) {
      this.log('[AUTH-CACHE] Usando token existente válido');
      return this.tokenStorage.accessToken;
    }

    return await this.getValidToken();
  }
}