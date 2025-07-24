import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { teamAPI, userAPI, departmentAPI } from '../../utils/api';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Container,
  Switch,
  FormControlLabel,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormGroup,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  People,
  Close,
  PersonAdd,
  Group,
  Business,
  Warning,
} from '@mui/icons-material';

const TeamManagement = () => {
  const { user, hasAnyRole } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTeams, setTotalTeams] = useState(0);

  const [users, setUsers] = useState([]);
  const [teamManagers, setTeamManagers] = useState([]);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [unassignedEmployees, setUnassignedEmployees] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const [addFormData, setAddFormData] = useState({
    name: '',
    code: '',
    description: '',
    teamManager: '',
    teamLeader: '',
    members: [],
    maxSize: 10
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    teamManager: '',
    teamLeader: '',
    maxSize: 10,
    isActive: true
  });

  const [memberFormData, setMemberFormData] = useState({
    userId: '',
    role: 'Member'
  });

  const [toggleLoading, setToggleLoading] = useState({});

  // Check if user can create/edit teams
  const canCreateTeams = hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']);
  const canManageAllTeams = hasAnyRole(['Admin', 'Vice President', 'HR BP', 'HR Manager', 'HR Executive']);
  const isTeamManager = user?.role === 'Team Manager';
  const isTeamLeader = user?.role === 'Team Leader';

  useEffect(() => {
    fetchTeams();
    fetchUsers();
    fetchUnassignedEmployees();
  }, [currentPage, searchTerm, departmentFilter, statusFilter]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        department: departmentFilter
      };

      if (statusFilter !== '') {
        params.isActive = statusFilter;
      }

      const response = await teamAPI.getAllTeams(params);
      
      if (response.data.success) {
        setTeams(response.data.teams || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalTeams(response.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };


  const fetchUsers = async () => {
    try {
      const response = await userAPI.getAllUsers({ limit: 1000 });
      if (response.data.success) {
        setUsers(response.data.users);
        setTeamManagers(response.data.users.filter(u => u.role === 'Team Manager'));
        setTeamLeaders(response.data.users.filter(u => u.role === 'Team Leader'));
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchUnassignedEmployees = async () => {
    try {
      const response = await teamAPI.getUnassignedEmployees();
      if (response.data.success) {
        setUnassignedEmployees(response.data.employees);
      }
    } catch (err) {
      console.error('Failed to fetch unassigned employees:', err);
    }
  };

  const handleOpenAddModal = () => {
    setAddFormData({
      name: '',
      code: '',
      description: '',
      teamManager: '',
      teamLeader: '',
      members: [],
      maxSize: 10
    });
    setValidationErrors({});
    setShowAddModal(true);
  };

  const handleAddInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleMembersChange = (e) => {
    const { value, checked } = e.target;
    setAddFormData(prev => ({
      ...prev,
      members: checked 
        ? [...prev.members, value]
        : prev.members.filter(id => id !== value)
    }));
  };

  const validateAddForm = () => {
    const errors = {};
    
    if (!addFormData.name.trim()) {
      errors.name = 'Team name is required';
    }
    
    if (!addFormData.code.trim()) {
      errors.code = 'Team code is required';
    } else if (!/^[A-Z0-9]+$/.test(addFormData.code)) {
      errors.code = 'Team code must contain only uppercase letters and numbers';
    }
    
    if (!addFormData.teamManager) {
      errors.teamManager = 'Team Manager is required';
    }
    
    if (!addFormData.teamLeader) {
      errors.teamLeader = 'Team Leader is required';
    }
    
    if (addFormData.maxSize < 1 || addFormData.maxSize > 50) {
      errors.maxSize = 'Max size must be between 1 and 50';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    
    if (!validateAddForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const teamData = {
        name: addFormData.name.trim(),
        code: addFormData.code.trim().toUpperCase(),
        description: addFormData.description.trim(),
        teamManager: addFormData.teamManager,
        teamLeader: addFormData.teamLeader,
        maxSize: parseInt(addFormData.maxSize)
      };

      const response = await teamAPI.createTeam(teamData);
      
      if (response.data.success) {
        // Add members to the team
        if (addFormData.members.length > 0) {
          for (const memberId of addFormData.members) {
            try {
              await teamAPI.addTeamMember(response.data.team._id, {
                userId: memberId,
                role: 'Member'
              });
            } catch (memberErr) {
              console.error('Error adding team member:', memberErr);
            }
          }
        }

        setShowAddModal(false);
        setAddFormData({
          name: '',
          code: '',
          description: '',
          teamManager: '',
          teamLeader: '',
          members: [],
          maxSize: 10
        });
        setValidationErrors({});
        setSuccess('Team created successfully!');
        fetchTeams();
        fetchUnassignedEmployees(); // Refresh unassigned employees list
      }
    } catch (err) {
      console.error('Create team error:', err);
      setError(getErrorMessage(err));
    }
  };

  // Edit Team Functions
  const handleOpenEditModal = (team) => {
    setEditingTeam(team);
    setEditFormData({
      name: team.name,
      description: team.description || '',
      teamManager: team.teamManager?._id || '',
      teamLeader: team.teamLeader?._id || '',
      maxSize: team.maxSize,
      isActive: team.isActive
    });
    setValidationErrors({});
    setShowEditModal(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateEditForm = () => {
    const errors = {};
    
    if (!editFormData.name.trim()) {
      errors.name = 'Team name is required';
    }
    
    if (!editFormData.teamManager) {
      errors.teamManager = 'Team Manager is required';
    }
    
    if (!editFormData.teamLeader) {
      errors.teamLeader = 'Team Leader is required';
    }
    
    if (editFormData.maxSize < 1 || editFormData.maxSize > 50) {
      errors.maxSize = 'Max size must be between 1 and 50';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditTeam = async (e) => {
    e.preventDefault();
    
    if (!validateEditForm()) {
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const teamData = {
        name: editFormData.name.trim(),
        description: editFormData.description.trim(),
        teamManager: editFormData.teamManager,
        teamLeader: editFormData.teamLeader,
        maxSize: parseInt(editFormData.maxSize),
        isActive: editFormData.isActive
      };

      const response = await teamAPI.updateTeam(editingTeam._id, teamData);
      
      if (response.data.success) {
        setShowEditModal(false);
        setEditingTeam(null);
        setEditFormData({
          name: '',
          description: '',
          teamManager: '',
          teamLeader: '',
          maxSize: 10,
          isActive: true
        });
        setValidationErrors({});
        setSuccess('Team updated successfully!');
        fetchTeams();
      }
    } catch (err) {
      console.error('Update team error:', err);
      setError(getErrorMessage(err));
    }
  };

  // Delete Team Functions
  const handleDeleteTeam = async (teamId, teamName) => {
    if (window.confirm(`Are you sure you want to delete the team "${teamName}"? This action cannot be undone.`)) {
      try {
        setError('');
        setSuccess('');

        const response = await teamAPI.deleteTeam(teamId);
        
        if (response.data.success) {
          setSuccess('Team deleted successfully!');
          fetchTeams();
          fetchUnassignedEmployees(); // Refresh unassigned employees list
        }
      } catch (err) {
        console.error('Delete team error:', err);
        setError(getErrorMessage(err));
      }
    }
  };

  // Manage Members Functions
  const handleOpenMembersModal = async (team) => {
    try {
      setSelectedTeam(team);
      setShowMembersModal(true);
      
      // Fetch detailed team information with members
      const response = await teamAPI.getTeamById(team._id);
      if (response.data.success) {
        setSelectedTeam(response.data.team);
      }
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!memberFormData.userId) {
      setError('Please select a user to add');
      return;
    }
    
    try {
      setError('');
      setSuccess('');

      const response = await teamAPI.addTeamMember(selectedTeam._id, {
        userId: memberFormData.userId,
        role: memberFormData.role
      });
      
      if (response.data.success) {
        setMemberFormData({ userId: '', role: 'Member' });
        setSuccess('Member added successfully!');
        
        // Refresh team details
        const teamResponse = await teamAPI.getTeamById(selectedTeam._id);
        if (teamResponse.data.success) {
          setSelectedTeam(teamResponse.data.team);
        }
        
        fetchTeams();
        fetchUnassignedEmployees();
      }
    } catch (err) {
      console.error('Add member error:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to remove ${userName} from this team?`)) {
      try {
        setError('');
        setSuccess('');

        // Handle case where userId is null (broken reference)
        if (!userId) {
          // For broken references, we need to manually clean up the team data
          // This is a fallback - ideally the backend should handle this
          setError('Cannot remove member with broken user reference. Please contact administrator.');
          return;
        }

        const response = await teamAPI.removeTeamMember(selectedTeam._id, userId);
        
        if (response.data.success) {
          setSuccess('Member removed successfully!');
          
          // Refresh team details
          const teamResponse = await teamAPI.getTeamById(selectedTeam._id);
          if (teamResponse.data.success) {
            setSelectedTeam(teamResponse.data.team);
          }
          
          fetchTeams();
          fetchUnassignedEmployees();
        }
      } catch (err) {
        console.error('Remove member error:', err);
        setError(getErrorMessage(err));
      }
    }
  };

  const handleRemoveBrokenMember = async (memberIndex) => {
    if (window.confirm('Are you sure you want to remove this broken member reference from the team?')) {
      try {
        setError('');
        setSuccess('');

        // Call the cleanup API to remove broken member references
        const response = await teamAPI.cleanupTeamMembers(selectedTeam._id);
        
        if (response.data.success) {
          setSelectedTeam(response.data.team);
          setSuccess(response.data.message);
          fetchTeams();
          fetchUnassignedEmployees();
        }
      } catch (err) {
        console.error('Remove broken member error:', err);
        setError(getErrorMessage(err));
      }
    }
  };

  // Toggle Team Status Function
  const handleToggleStatus = async (teamId, currentStatus) => {
    try {
      setToggleLoading(prev => ({ ...prev, [teamId]: true }));
      setError('');
      setSuccess('');

      const response = await teamAPI.toggleTeamStatus(teamId);
      
      if (response.data.success) {
        setSuccess(response.data.message);
        fetchTeams(); // Refresh the teams list
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      setError(getErrorMessage(err));
    } finally {
      setToggleLoading(prev => ({ ...prev, [teamId]: false }));
    }
  };

  // Check if user can edit/delete specific team
  const canEditTeam = (team) => {
    return canManageAllTeams || 
           (isTeamManager && team.teamManager && team.teamManager._id === user._id);
  };

  const canDeleteTeam = (team) => {
    return canManageAllTeams;
  };

  const canManageMembers = (team) => {
    return canManageAllTeams || 
           (isTeamManager && team.teamManager && team.teamManager._id === user._id);
  };

  const canToggleStatus = (team) => {
    return canManageAllTeams;
  };

  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    }
    
    if (error?.response?.data) {
      const data = error.response.data;
      
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.map(err => err.msg || err.message).join(', ');
      }
      
      if (data.message) {
        return data.message;
      }
    }
    
    if (error?.message) {
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`badge ${isActive ? 'bg-success' : 'bg-danger'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const getInitials = (firstName, lastName) => {
    if (!firstName && !lastName) return 'U';
    const first = firstName ? firstName.charAt(0).toUpperCase() : '';
    const last = lastName ? lastName.charAt(0).toUpperCase() : '';
    return first + last;
  };

  if (loading && teams.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress size={60} sx={{ color: '#20C997' }} />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#0A192F', mb: 1 }}>
            Team Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {isTeamLeader ? 'View your team details' : 
             isTeamManager ? 'Manage your assigned teams' : 
             'Manage all teams and their members'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Chip 
            label={`${totalTeams} Total Teams`} 
            color="primary" 
            sx={{ fontWeight: 600 }} 
          />
          {canCreateTeams && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleOpenAddModal}
              sx={{
                backgroundColor: '#20C997',
                '&:hover': {
                  backgroundColor: '#17A085',
                },
                borderRadius: 2,
                px: 3,
                py: 1.5,
                fontWeight: 600,
              }}
            >
              Add Team
            </Button>
          )}
        </Box>
      </Box>

      {/* Success Alert */}
      {success && (
        <Alert
          severity="success"
          onClose={() => setSuccess('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {success}
        </Alert>
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError('')}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* Teams Table */}
      <Card sx={{ borderRadius: 3 }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={60} sx={{ color: '#20C997' }} />
            </Box>
          ) : teams.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Group sx={{ fontSize: '4rem', color: 'text.disabled', mb: 2 }} />
              <Typography variant="h5" sx={{ color: 'text.secondary', mb: 1 }}>
                No teams found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {canCreateTeams ? 'Create your first team to get started' : 'No teams available'}
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Team</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Team Manager</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Team Leader</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Members</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#0A192F' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {teams.map((team) => (
                    <TableRow key={team._id} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {team.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip
                              label={team.code}
                              variant="outlined"
                              size="small"
                              sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                            />
                            {team.description && (
                              <Typography variant="caption" color="text.secondary">
                                • {team.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {team.teamManager ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              sx={{
                                bgcolor: '#0A192F',
                                color: 'white',
                                width: 32,
                                height: 32,
                                mr: 1.5,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                              }}
                            >
                              {getInitials(team.teamManager.firstName, team.teamManager.lastName)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {team.teamManager.firstName} {team.teamManager.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {team.teamManager.email}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {team.teamLeader ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              sx={{
                                bgcolor: '#20C997',
                                color: 'white',
                                width: 32,
                                height: 32,
                                mr: 1.5,
                                fontSize: '0.875rem',
                                fontWeight: 600,
                              }}
                            >
                              {getInitials(team.teamLeader.firstName, team.teamLeader.lastName)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {team.teamLeader.firstName} {team.teamLeader.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {team.teamLeader.email}
                              </Typography>
                            </Box>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Not assigned
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${team.currentSize || 0} / ${team.maxSize}`}
                          color="info"
                          size="small"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={team.isActive ? 'Active' : 'Inactive'}
                          color={team.isActive ? 'success' : 'error'}
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {/* Status Toggle */}
                          {canToggleStatus(team) && (
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Switch
                                checked={team.isActive}
                                onChange={() => handleToggleStatus(team._id, team.isActive)}
                                disabled={toggleLoading[team._id]}
                                size="small"
                                sx={{
                                  '& .MuiSwitch-switchBase.Mui-checked': {
                                    color: '#20C997',
                                  },
                                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                    backgroundColor: '#20C997',
                                  },
                                }}
                              />
                              {toggleLoading[team._id] && (
                                <CircularProgress size={16} sx={{ ml: 1 }} />
                              )}
                            </Box>
                          )}
                          
                          {/* Action Buttons */}
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Manage Members">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenMembersModal(team)}
                                disabled={!canManageMembers(team)}
                                sx={{
                                  color: '#20C997',
                                  '&:hover': {
                                    backgroundColor: 'rgba(32, 201, 151, 0.1)',
                                  },
                                }}
                              >
                                <People fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Team">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenEditModal(team)}
                                disabled={!canEditTeam(team)}
                                sx={{
                                  color: '#666',
                                  '&:hover': {
                                    backgroundColor: 'rgba(102, 102, 102, 0.1)',
                                  },
                                }}
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete Team">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteTeam(team._id, team.name)}
                                disabled={!canDeleteTeam(team)}
                                sx={{
                                  color: '#F44336',
                                  '&:hover': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                  },
                                }}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Team Modal */}
      <Dialog
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setValidationErrors({});
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Create New Team
            </Typography>
            <IconButton 
              onClick={() => {
                setShowAddModal(false);
                setValidationErrors({});
              }}
              sx={{ color: 'text.secondary' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleAddTeam}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Team Name"
                  name="name"
                  value={addFormData.name}
                  onChange={handleAddInputChange}
                  placeholder="e.g., Development Team Alpha"
                  required
                  error={!!validationErrors.name}
                  helperText={validationErrors.name}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Team Code"
                  name="code"
                  value={addFormData.code}
                  onChange={handleAddInputChange}
                  placeholder="e.g., DEV001"
                  inputProps={{
                    maxLength: 10,
                    style: { textTransform: 'uppercase' }
                  }}
                  required
                  error={!!validationErrors.code}
                  helperText={validationErrors.code || "Only uppercase letters and numbers allowed"}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Team Description"
                  name="description"
                  value={addFormData.description}
                  onChange={handleAddInputChange}
                  multiline
                  rows={2}
                  placeholder="Brief description of the team's purpose"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Team Size"
                  name="maxSize"
                  type="number"
                  value={addFormData.maxSize}
                  onChange={handleAddInputChange}
                  inputProps={{ min: 1, max: 50 }}
                  error={!!validationErrors.maxSize}
                  helperText={validationErrors.maxSize}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.teamManager} sx={{ mb: 2 }}>
                  <InputLabel>Team Manager *</InputLabel>
                  <Select
                    name="teamManager"
                    value={addFormData.teamManager}
                    onChange={handleAddInputChange}
                    label="Team Manager *"
                    required
                  >
                    <MenuItem value="">Select Team Manager</MenuItem>
                    {teamManagers.map(manager => (
                      <MenuItem key={manager._id} value={manager._id}>
                        {manager.firstName} {manager.lastName} ({manager.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {validationErrors.teamManager && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {validationErrors.teamManager}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.teamLeader} sx={{ mb: 2 }}>
                  <InputLabel>Team Leader *</InputLabel>
                  <Select
                    name="teamLeader"
                    value={addFormData.teamLeader}
                    onChange={handleAddInputChange}
                    label="Team Leader *"
                    required
                  >
                    <MenuItem value="">Select Team Leader</MenuItem>
                    {teamLeaders.map(leader => (
                      <MenuItem key={leader._id} value={leader._id}>
                        {leader.firstName} {leader.lastName} ({leader.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {validationErrors.teamLeader && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {validationErrors.teamLeader}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Team Members
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    maxHeight: '200px', 
                    overflowY: 'auto',
                    backgroundColor: '#fafafa'
                  }}
                >
                  {unassignedEmployees.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No unassigned employees available
                    </Typography>
                  ) : (
                    <FormGroup>
                      {unassignedEmployees.map(employee => (
                        <FormControlLabel
                          key={employee._id}
                          control={
                            <Checkbox
                              value={employee._id}
                              checked={addFormData.members.includes(employee._id)}
                              onChange={handleMembersChange}
                              sx={{
                                '&.Mui-checked': {
                                  color: '#20C997',
                                },
                              }}
                            />
                          }
                          label={`${employee.firstName} ${employee.lastName} (${employee.email})`}
                          sx={{ mb: 1 }}
                        />
                      ))}
                    </FormGroup>
                  )}
                </Paper>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Select employees to add to this team (only unassigned employees are shown)
                </Typography>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setShowAddModal(false);
                setValidationErrors({});
              }}
              sx={{
                color: '#666',
                borderColor: '#E0E0E0',
                '&:hover': {
                  borderColor: '#20C997',
                  backgroundColor: 'rgba(32, 201, 151, 0.04)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#20C997',
                '&:hover': {
                  backgroundColor: '#17A085',
                },
                px: 3,
                fontWeight: 600,
              }}
            >
              Create Team
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Team Modal */}
      <Dialog
        open={showEditModal && !!editingTeam}
        onClose={() => {
          setShowEditModal(false);
          setEditingTeam(null);
          setValidationErrors({});
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Edit Team - {editingTeam?.name}
            </Typography>
            <IconButton 
              onClick={() => {
                setShowEditModal(false);
                setEditingTeam(null);
                setValidationErrors({});
              }}
              sx={{ color: 'text.secondary' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleEditTeam}>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Team Name"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="e.g., Development Team Alpha"
                  required
                  error={!!validationErrors.name}
                  helperText={validationErrors.name}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Team Code"
                  value={editingTeam?.code || ''}
                  disabled
                  helperText="Team code cannot be changed"
                  sx={{ 
                    mb: 2,
                    '& .MuiInputBase-input.Mui-disabled': {
                      backgroundColor: '#f8f9fa',
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Team Description"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  multiline
                  rows={2}
                  placeholder="Brief description of the team's purpose"
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Max Team Size"
                  name="maxSize"
                  type="number"
                  value={editFormData.maxSize}
                  onChange={handleEditInputChange}
                  inputProps={{ min: 1, max: 50 }}
                  error={!!validationErrors.maxSize}
                  helperText={validationErrors.maxSize}
                  sx={{ mb: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={editFormData.isActive}
                      onChange={handleEditInputChange}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#20C997',
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#20C997',
                        },
                      }}
                    />
                  }
                  label="Team is Active"
                  sx={{ mt: 2 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.teamManager} sx={{ mb: 2 }}>
                  <InputLabel>Team Manager *</InputLabel>
                  <Select
                    name="teamManager"
                    value={editFormData.teamManager}
                    onChange={handleEditInputChange}
                    label="Team Manager *"
                    required
                  >
                    <MenuItem value="">Select Team Manager</MenuItem>
                    {teamManagers.map(manager => (
                      <MenuItem key={manager._id} value={manager._id}>
                        {manager.firstName} {manager.lastName} ({manager.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {validationErrors.teamManager && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {validationErrors.teamManager}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!validationErrors.teamLeader} sx={{ mb: 2 }}>
                  <InputLabel>Team Leader *</InputLabel>
                  <Select
                    name="teamLeader"
                    value={editFormData.teamLeader}
                    onChange={handleEditInputChange}
                    label="Team Leader *"
                    required
                  >
                    <MenuItem value="">Select Team Leader</MenuItem>
                    {teamLeaders.map(leader => (
                      <MenuItem key={leader._id} value={leader._id}>
                        {leader.firstName} {leader.lastName} ({leader.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {validationErrors.teamLeader && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                      {validationErrors.teamLeader}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              onClick={() => {
                setShowEditModal(false);
                setEditingTeam(null);
                setValidationErrors({});
              }}
              sx={{
                color: '#666',
                borderColor: '#E0E0E0',
                '&:hover': {
                  borderColor: '#20C997',
                  backgroundColor: 'rgba(32, 201, 151, 0.04)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#20C997',
                '&:hover': {
                  backgroundColor: '#17A085',
                },
                px: 3,
                fontWeight: 600,
              }}
            >
              Update Team
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog
        open={showMembersModal && !!selectedTeam}
        onClose={() => {
          setShowMembersModal(false);
          setSelectedTeam(null);
          setMemberFormData({ userId: '', role: 'Member' });
        }}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Manage Team Members - {selectedTeam?.name}
            </Typography>
            <IconButton 
              onClick={() => {
                setShowMembersModal(false);
                setSelectedTeam(null);
                setMemberFormData({ userId: '', role: 'Member' });
              }}
              sx={{ color: 'text.secondary' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* Team Information */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardHeader 
                  title="Team Information" 
                  titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                  sx={{ pb: 1 }}
                />
                <CardContent>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Team Code:
                    </Typography>
                    <Chip 
                      label={selectedTeam?.code} 
                      variant="outlined" 
                      size="small" 
                      sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Description:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedTeam?.description || 'No description'}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Max Size:
                    </Typography>
                    <Typography variant="body2">{selectedTeam?.maxSize}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Current Size:
                    </Typography>
                    <Typography variant="body2">{selectedTeam?.members?.length || 0}</Typography>
                  </Box>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      Status:
                    </Typography>
                    <Chip
                      label={selectedTeam?.isActive ? 'Active' : 'Inactive'}
                      color={selectedTeam?.isActive ? 'success' : 'error'}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Team Manager:
                    </Typography>
                    {selectedTeam?.teamManager ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            bgcolor: '#0A192F',
                            color: 'white',
                            width: 32,
                            height: 32,
                            mr: 1.5,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                          }}
                        >
                          {getInitials(selectedTeam.teamManager.firstName, selectedTeam.teamManager.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {selectedTeam.teamManager.firstName} {selectedTeam.teamManager.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {selectedTeam.teamManager.email}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not assigned
                      </Typography>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                      Team Leader:
                    </Typography>
                    {selectedTeam?.teamLeader ? (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            bgcolor: '#20C997',
                            color: 'white',
                            width: 32,
                            height: 32,
                            mr: 1.5,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                          }}
                        >
                          {getInitials(selectedTeam.teamLeader.firstName, selectedTeam.teamLeader.lastName)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {selectedTeam.teamLeader.firstName} {selectedTeam.teamLeader.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {selectedTeam.teamLeader.email}
                          </Typography>
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not assigned
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            {/* Current Members */}
            <Grid item xs={12} md={8}>
              <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
                <CardHeader 
                  title={`Current Members (${selectedTeam?.members?.length || 0})`}
                  titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                  sx={{ pb: 1 }}
                />
                <CardContent>
                  {selectedTeam?.members && selectedTeam.members.length > 0 ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Joined Date</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selectedTeam.members.map((member, index) => {
                            // Handle case where member.user is null (broken reference)
                            if (!member.user) {
                              return (
                                <TableRow key={`broken-member-${index}`} sx={{ backgroundColor: '#fff3cd' }}>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Warning sx={{ color: '#856404', mr: 1, fontSize: '1rem' }} />
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#856404' }}>
                                          Deleted User
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          User data not found
                                        </Typography>
                                      </Box>
                                    </Box>
                                  </TableCell>
                                  <TableCell>
                                    <Chip label={member.role} size="small" color="default" />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {new Date(member.joinedDate).toLocaleDateString()}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title="Remove Broken Reference">
                                      <IconButton
                                        size="small"
                                        onClick={() => handleRemoveBrokenMember(index)}
                                        sx={{ color: '#F44336' }}
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            }

                            return (
                              <TableRow key={member.user._id} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Avatar
                                      sx={{
                                        bgcolor: '#20C997',
                                        color: 'white',
                                        width: 32,
                                        height: 32,
                                        mr: 1.5,
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {getInitials(member.user.firstName, member.user.lastName)}
                                    </Avatar>
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                        {member.user.firstName} {member.user.lastName}
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {member.user.email}
                                      </Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Chip label={member.role} size="small" color="primary" />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">
                                    {new Date(member.joinedDate).toLocaleDateString()}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Tooltip title="Remove Member">
                                    <IconButton
                                      size="small"
                                      onClick={() => handleRemoveMember(
                                        member.user._id, 
                                        `${member.user.firstName} ${member.user.lastName}`
                                      )}
                                      sx={{ color: '#F44336' }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <People sx={{ fontSize: '3rem', color: 'text.disabled', mb: 2 }} />
                      <Typography variant="body1" color="text.secondary">
                        No members in this team yet
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
              
              {/* Add New Member */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardHeader 
                  title="Add New Member"
                  titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                  sx={{ pb: 1 }}
                />
                <CardContent>
                  <form onSubmit={handleAddMember}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={8}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Select Employee</InputLabel>
                          <Select
                            value={memberFormData.userId}
                            onChange={(e) => setMemberFormData(prev => ({
                              ...prev,
                              userId: e.target.value
                            }))}
                            label="Select Employee"
                            required
                          >
                            <MenuItem value="">Choose an employee...</MenuItem>
                            {unassignedEmployees.map(employee => (
                              <MenuItem key={employee._id} value={employee._id}>
                                {employee.firstName} {employee.lastName} ({employee.email})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                          <InputLabel>Role</InputLabel>
                          <Select
                            value={memberFormData.role}
                            onChange={(e) => setMemberFormData(prev => ({
                              ...prev,
                              role: e.target.value
                            }))}
                            label="Role"
                          >
                            <MenuItem value="Member">Member</MenuItem>
                            <MenuItem value="Senior Member">Senior Member</MenuItem>
                            <MenuItem value="Lead">Lead</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Button 
                          type="submit" 
                          variant="contained"
                          startIcon={<PersonAdd />}
                          disabled={!memberFormData.userId}
                          sx={{
                            backgroundColor: '#20C997',
                            '&:hover': {
                              backgroundColor: '#17A085',
                            },
                            fontWeight: 600,
                          }}
                        >
                          Add Member
                        </Button>
                      </Grid>
                    </Grid>
                  </form>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => {
              setShowMembersModal(false);
              setSelectedTeam(null);
              setMemberFormData({ userId: '', role: 'Member' });
            }}
            sx={{
              color: '#666',
              borderColor: '#E0E0E0',
              '&:hover': {
                borderColor: '#20C997',
                backgroundColor: 'rgba(32, 201, 151, 0.04)',
              },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeamManagement;
