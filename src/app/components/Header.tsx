'use client';

import { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Chip, IconButton } from '@mui/material';
import { PhotoLibrary, GitHub, Info, Settings as SettingsIcon } from '@mui/icons-material';
import Settings from './Settings';

const Header = () => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  return (
    <>
      <AppBar position="static" sx={{ mb: 4 }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <PhotoLibrary sx={{ mr: 2, fontSize: 32 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
              OpenLoveImage
            </Typography>
            <Chip 
              label="Free" 
              size="small" 
              color="secondary" 
              sx={{ ml: 2 }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              color="inherit"
              onClick={handleSettingsOpen}
              sx={{ mr: 1 }}
            >
              <SettingsIcon />
            </IconButton>

            <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2 }}>
              <Button
                color="inherit"
                startIcon={<Info />}
                href="#features"
                sx={{ textTransform: 'none' }}
              >
                Features
              </Button>
              <Button
                color="inherit"
                startIcon={<GitHub />}
                href="https://github.com/ireddragonicy/openloveimage"
                target="_blank"
                sx={{ textTransform: 'none' }}
              >
                GitHub
              </Button>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Settings 
        open={settingsOpen} 
        onClose={handleSettingsClose} 
      />
    </>
  );
};

export default Header; 