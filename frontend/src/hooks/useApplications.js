import { useState, useCallback } from 'react';
import ApplicationService from '../services/applicationService';

const useApplications = () => {
  const [applications, setApplications] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const applyForJob = useCallback(async (jobId, coverLetter = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ApplicationService.applyForJob(jobId, coverLetter);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to apply for job');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getMyApplications = useCallback(async (page = 1, perPage = 15) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApplicationService.getMyApplications(page, perPage);
      setApplications(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getJobApplications = useCallback(async (jobId, page = 1, perPage = 15) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ApplicationService.getJobApplications(jobId, page, perPage);
      setApplications(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message || 'Failed to fetch applications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateApplicationStatus = useCallback(async (applicationId, status, stage = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ApplicationService.updateApplicationStatus(
        applicationId,
        status,
        stage
      );
      return response;
    } catch (err) {
      setError(err.message || 'Failed to update application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const withdrawApplication = useCallback(async (applicationId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ApplicationService.withdrawApplication(applicationId);
      return response;
    } catch (err) {
      setError(err.message || 'Failed to withdraw application');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    applications,
    pagination,
    isLoading,
    error,
    applyForJob,
    getMyApplications,
    getJobApplications,
    updateApplicationStatus,
    withdrawApplication,
  };
};

export default useApplications;
