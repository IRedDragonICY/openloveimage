'use client';

import Header from './components/Header';
import ImageConverterApp from './components/ImageConverter';
import { Box, Container, Typography, Divider } from '@mui/material';

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header />
      
      <main>
        <ImageConverterApp />
      </main>

      {/* Footer */}
      <Box 
        component="footer" 
        sx={{ 
          mt: 8, 
          py: 4, 
          backgroundColor: 'background.paper',
          borderTop: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Container maxWidth="lg">
          <Divider sx={{ mb: 3 }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              OpenLoveImage
            </Typography>
            <Typography variant="body2" component="div" color="text.secondary" sx={{ mb: 2 }}>
              Free, secure, and powerful image conversion tool built with modern web technologies
            </Typography>
            <Typography variant="caption" component="div" color="text.secondary">
              Built with Next.js, TypeScript, Material-UI, and heic-to library
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" component="div" color="text.secondary">
                © {new Date().getFullYear()} OpenLoveImage. All rights reserved. 
                Made with ❤️ for the open source community.
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
