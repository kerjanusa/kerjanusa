import apiClient from '../utils/apiClient';

class AdminService {
  /**
   * Get the live dashboard payload for the authenticated superadmin.
   */
  static async getDashboard() {
    try {
      const response = await apiClient.get('/admin/dashboard');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
}

export default AdminService;
