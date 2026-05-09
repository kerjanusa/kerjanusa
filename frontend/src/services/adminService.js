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

  static async updateUser(userId, payload) {
    try {
      const response = await apiClient.put(`/admin/users/${userId}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }

  static async sendResetLink(userId) {
    try {
      const response = await apiClient.post(`/admin/users/${userId}/send-reset-link`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }

  static async reassignJob(jobId, recruiterId) {
    try {
      const response = await apiClient.put(`/admin/jobs/${jobId}/reassign`, {
        recruiter_id: recruiterId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }

  static async updateJob(jobId, payload) {
    try {
      const response = await apiClient.put(`/jobs/${jobId}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
}

export default AdminService;
