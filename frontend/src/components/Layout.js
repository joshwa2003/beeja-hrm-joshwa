import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  useTheme,
  useMediaQuery,
  Container,
} from '@mui/material';

import Sidebar from './Sidebar';
import ProfileSidebar from './ProfileSidebar';
import TopNavBar from './TopNavBar';

const DRAWER_WIDTH = 280;

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  const location = useLocation();

  // Check if current page is profile page
  const isProfilePage = location.pathname === '/profile';

  useEffect(() => {
    if (isLargeScreen) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isLargeScreen]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleDrawerClose = () => {
    if (!isLargeScreen) {
      setSidebarOpen(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Top Navigation Bar */}
      <TopNavBar onToggleSidebar={toggleSidebar} />
      
      {/* Sidebar Drawer */}
      <Drawer
        variant={isLargeScreen ? 'persistent' : 'temporary'}
        anchor="left"
        open={sidebarOpen}
        onClose={handleDrawerClose}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: '64px', // Below the AppBar
            height: 'calc(100vh - 64px)',
            borderRight: 'none',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          },
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile
        }}
      >
        {/* Conditionally render sidebar based on page */}
        {isProfilePage ? (
          <ProfileSidebar isOpen={sidebarOpen} onToggle={handleDrawerClose} />
        ) : (
          <Sidebar isOpen={sidebarOpen} onToggle={handleDrawerClose} />
        )}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: theme.palette.background.default,
          mt: '64px', // Account for AppBar height
          ml: isLargeScreen && sidebarOpen ? 0 : 0, // Drawer handles the spacing
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            py: 3,
            px: 3,
            maxWidth: '100%',
          }}
        >
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default Layout;
