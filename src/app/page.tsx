'use client';

import Header from './components/Header';
import ImageConverterApp from './components/ImageConverter';
import { Box, Container, Typography, Divider, Card, CardContent, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { CheckCircle, Security, Speed, CloudOff } from '@mui/icons-material';

export default function Home() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
      <Header />
      
      <main>
        {/* Hero Section with SEO Content */}
        <Container maxWidth="lg" sx={{ mb: 6 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h1" component="h1" sx={{ 
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 700,
              mb: 2,
              background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Free Online Image Converter
            </Typography>
            <Typography variant="h2" component="h2" sx={{ 
              fontSize: { xs: '1.25rem', md: '1.5rem' },
              color: 'text.secondary',
              mb: 3,
              maxWidth: '800px',
              mx: 'auto'
            }}>
              Convert HEIC to JPG, PNG, WebP, and more formats instantly. 
              Secure, fast, and works entirely in your browser.
            </Typography>
          </Box>
        </Container>

        <ImageConverterApp />

        {/* Features Section for SEO */}
        <Container maxWidth="lg" sx={{ mt: 8, mb: 6 }} id="features">
          <Typography variant="h2" component="h2" sx={{ 
            textAlign: 'center', 
            mb: 4,
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 600
          }}>
            Why Choose OpenLoveImage?
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Security sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', mb: 2 }}>
                    100% Private & Secure
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Your images never leave your device. All processing happens locally in your browser for maximum privacy and security.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <Speed sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', mb: 2 }}>
                    Lightning Fast
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Convert images instantly with our optimized processing engine. No waiting, no upload time - just results.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Card sx={{ height: '100%', textAlign: 'center' }}>
                <CardContent>
                  <CloudOff sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', mb: 2 }}>
                    No Upload Required
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Work offline and keep your images private. No cloud uploads, no registration, completely free to use.
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Container>

        {/* Supported Formats Section */}
        <Container maxWidth="lg" sx={{ mb: 6 }}>
          <Typography variant="h2" component="h2" sx={{ 
            textAlign: 'center', 
            mb: 4,
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 600
          }}>
            Supported Image Formats
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', mb: 2 }}>
                Convert From:
              </Typography>
              <List>
                {['HEIC/HEIF', 'JPG/JPEG', 'PNG', 'WebP', 'GIF', 'BMP', 'TIFF', 'SVG'].map((format) => (
                  <ListItem key={format} disablePadding>
                    <ListItemIcon>
                      <CheckCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={format} />
                  </ListItem>
                ))}
              </List>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" component="h3" sx={{ fontSize: '1.5rem', mb: 2 }}>
                Convert To:
              </Typography>
              <List>
                {['JPG/JPEG', 'PNG', 'WebP', 'GIF', 'BMP', 'TIFF', 'ICO', 'PDF'].map((format) => (
                  <ListItem key={format} disablePadding>
                    <ListItemIcon>
                      <CheckCircle color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={format} />
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </Container>

        {/* How to Use Section */}
        <Container maxWidth="lg" sx={{ mb: 6 }}>
          <Typography variant="h2" component="h2" sx={{ 
            textAlign: 'center', 
            mb: 4,
            fontSize: { xs: '2rem', md: '2.5rem' },
            fontWeight: 600
          }}>
            How to Convert Images
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                backgroundColor: 'primary.main', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                mx: 'auto', 
                mb: 2 
              }}>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  1
                </Typography>
              </Box>
              <Typography variant="h3" component="h3" sx={{ fontSize: '1.25rem', mb: 1 }}>
                Upload Images
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Drag and drop or click to select your images. Multiple files supported.
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                backgroundColor: 'primary.main', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                mx: 'auto', 
                mb: 2 
              }}>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  2
                </Typography>
              </Box>
              <Typography variant="h3" component="h3" sx={{ fontSize: '1.25rem', mb: 1 }}>
                Choose Format
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Select your desired output format and quality settings.
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Box sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                backgroundColor: 'primary.main', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                mx: 'auto', 
                mb: 2 
              }}>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
                  3
                </Typography>
              </Box>
              <Typography variant="h3" component="h3" sx={{ fontSize: '1.25rem', mb: 1 }}>
                Download
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Get your converted images instantly. No waiting required.
              </Typography>
            </Box>
          </Box>
        </Container>
      </main>

      {/* Enhanced Footer */}
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
              Free, secure, and powerful image conversion tool built with modern web technologies.
              Convert HEIC to JPG, PNG to WebP, and many more formats with ease.
            </Typography>
            <Typography variant="caption" component="div" color="text.secondary">
              Built with Next.js, TypeScript, Material-UI, and advanced image processing libraries
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
