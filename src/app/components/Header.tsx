'use client';

import { AppBar, Toolbar, Typography, Box, Button, Chip } from '@mui/material';
import { PhotoLibrary, GitHub, Info } from '@mui/icons-material';

const Header = () => {
  return (
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
            href="https://github.com"
            target="_blank"
            sx={{ textTransform: 'none' }}
          >
            GitHub
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 