/**
 * API Client with Authentication
 * 
 * Wrapper around fetch that automatically includes auth tokens
 */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiClient {
  private baseURL: string;
  
  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    const sessionId = localStorage.getItem('sessionId');
    
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(sessionId && { 'X-Session-Id': sessionId })
    };
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const data = await response.json();
    
    if (!response.ok) {
      // Handle 401 - unauthorized/token expired
      if (response.status === 401) {
        // Clear invalid auth
        localStorage.removeItem('token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('user');
        // Redirect to login
        window.location.href = '/login';
      }
      
      return {
        success: false,
        error: data.error || 'Request failed',
        code: data.code
      };
    }
    
    return data;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(this.baseURL + endpoint, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    
    return this.parseResponse<T>(response);
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(this.baseURL + endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    
    return this.parseResponse<T>(response);
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(this.baseURL + endpoint, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    
    return this.parseResponse<T>(response);
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const response = await fetch(this.baseURL + endpoint, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    
    return this.parseResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(this.baseURL + endpoint, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    return this.parseResponse<T>(response);
  }
}

// Export singleton instance
export const api = new ApiClient();

// Convenience exports for common patterns
export default api;
