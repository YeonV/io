// src/renderer/src/components/Settings/SettingsAbout.tsx
import {
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  Divider,
  Grid,
  Link as MuiLink,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@mui/material'
import {
  InfoOutlined as AboutAppIcon, // For section title
  GitHub as GitHubIcon,
  DescriptionOutlined as LicenseIcon, // For license
  BuildOutlined as VersionIcon, // For version details
  Code as CodeIcon, // For Electron/Node versions
  InfoOutlined
} from '@mui/icons-material'
import { useState, type FC } from 'react'
import pkg from '../../../../../package.json' with { type: 'json' }
import appLogo from '@/assets/logo-cropped.svg' // Assuming you want to use this logo

const ipcRenderer = window.electron?.ipcRenderer || false

const SettingsAbout: FC = () => {
  // process.versions is only available in Electron's main or preload (if exposed)
  // window.electron.process.versions was how you had it, assuming it's exposed via contextBridge
  const versions = ipcRenderer ? window.electron?.process?.versions : null

  const appInfo = {
    name: pkg.productName || pkg.name || 'InputOutput', // Use productName from package.json if available
    description: pkg.description || 'InputOutput Automation Hub',
    version: pkg.version,
    author: pkg.author, // Can be object or string
    license: pkg.license
  }

  const authorName = typeof appInfo.author === 'object' ? appInfo.author.name : appInfo.author
  // const authorEmail = typeof appInfo.author === 'object' ? appInfo.author.email : undefined
  const repoUrl = `https://github.com/${authorName}/${pkg.name}` // Assuming authorName is GitHub user/org

  const techVersions = [
    { name: 'Electron', version: versions?.electron, available: !!ipcRenderer },
    { name: 'Chromium', version: versions?.chrome, available: !!ipcRenderer },
    { name: 'Node.js', version: versions?.node, available: !!ipcRenderer },
    { name: 'V8', version: versions?.v8, available: !!ipcRenderer }
  ]

  return (
    <Paper
      sx={{ p: 3, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
    >
      <Stack spacing={3}>
        {/* App Info Section */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <img
            src={appLogo}
            alt={`${appInfo.name} Logo`}
            style={{ width: '100px', height: 'auto', marginBottom: '8px' }}
          />
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'medium' }}>
            {appInfo.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {appInfo.description}
          </Typography>
        </Box>
        <Divider />
        {/* Version Information Section */}
        <Box>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 'medium', mb: 1.5, display: 'flex', alignItems: 'center' }}
          >
            <VersionIcon sx={{ mr: 1, opacity: 0.8 }} /> Version Information
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              Application Version: <Chip label={appInfo.version} color="primary" size="small" />
            </Typography>
            {appInfo.license && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                License: {appInfo.license}
                {/* TODO: Add button/link to view full license text */}
              </Typography>
            )}
            {ipcRenderer && techVersions.some((v) => v.version) && (
              <Box sx={{ mt: 1.5 }}>
                <Typography
                  variant="overline"
                  display="block"
                  sx={{ color: 'text.secondary', mb: 0.5 }}
                >
                  Platform Details (Electron Mode):
                </Typography>
                <Grid container spacing={0.5} sx={{ pl: 1 }}>
                  {techVersions
                    .filter((v) => v.version)
                    .map((item) => (
                      <Grid size={{ xs: 6, sm: 3 }} key={item.name}>
                        <Typography
                          variant="caption"
                          component="span"
                          sx={{ fontWeight: 'medium' }}
                        >
                          {item.name}:{' '}
                        </Typography>
                        <Typography variant="caption" component="span" color="text.secondary">
                          {item.version}
                        </Typography>
                      </Grid>
                    ))}
                </Grid>
              </Box>
            )}
            {!ipcRenderer && (
              <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.disabled' }}>
                Platform details (Electron, Node.js, etc.) are not applicable in web mode.
              </Typography>
            )}
          </Paper>
        </Box>
        {/* Creator & Links Section */}
        <Box>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 'medium', mb: 1.5, display: 'flex', alignItems: 'center' }}
          >
            <CodeIcon sx={{ mr: 1, opacity: 0.8 }} /> Developer & Links
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5 }}>
            <Typography variant="body1" sx={{ mb: 1.5 }}>
              Crafted with ❤️ by **{authorName || 'Blade (YeonV)'}**.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<GitHubIcon />}
                onClick={() => ipcRenderer && ipcRenderer.send('open-link-external', repoUrl)}
                disabled={!ipcRenderer && !repoUrl.startsWith('http')} // Disable if no IPC and not a web link
              >
                GitHub Repository
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<InfoOutlined />} // Using the existing alias from Settings.tsx
                onClick={() =>
                  ipcRenderer && ipcRenderer.send('open-link-external', `${repoUrl}/issues`)
                }
                disabled={!ipcRenderer && !repoUrl.startsWith('http')}
              >
                Report an Issue
              </Button>
              {/* Add more links if needed: Documentation, Website etc. */}
            </Stack>
          </Paper>
        </Box>
        {/* Copyright - pushed to bottom if parent is flex column */}
        <Box sx={{ flexGrow: 1 }} /> {/* Spacer to push copyright down */}
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 3, textAlign: 'center', color: 'text.disabled' }}
        >
          © {new Date().getFullYear()} {authorName || 'YeonV'}. All rights reserved.
        </Typography>
      </Stack>
    </Paper>
  )
}

export default SettingsAbout
