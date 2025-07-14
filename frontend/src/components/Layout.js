import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopNavBar from './TopNavBar';
import Sidebar from './Sidebar';
import ProfileSidebar from './ProfileSidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 992);
  const location = useLocation();

  // Check if current page is profile page
  const isProfilePage = location.pathname === '/profile';

  useEffect(() => {
    const handleResize = () => {
      const largeScreen = window.innerWidth >= 992;
      setIsLargeScreen(largeScreen);
      if (largeScreen) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-vh-100 bg-light">
      <TopNavBar onToggleSidebar={toggleSidebar} />
      
      {/* Conditionally render sidebar based on page */}
      {isProfilePage ? (
        <ProfileSidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      ) : (
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      )}
      
      {/* Main Content */}
      <main 
        style={{ 
          marginLeft: isLargeScreen && sidebarOpen ? '280px' : '0',
          minHeight: 'calc(100vh - 56px)',
          marginTop: '56px',
          transition: 'margin-left 0.3s ease-in-out'
        }}
      >
        <div className="container-fluid p-4">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
