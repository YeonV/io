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
  Chip,
  CircularProgress,
  Alert
} from '@mui/material'
import {
  GitHub as GitHubIcon,
  DescriptionOutlined as LicenseIcon,
  BuildOutlined as VersionIcon,
  Code as CodeIcon,
  InfoOutlined as AboutAppIcon, // Used for "Report an Issue"
  SystemUpdateAlt as UpdateIcon, // For update check
  CheckCircleOutline as UpToDateIcon,
  NewReleasesOutlined as NewReleaseIcon,
  Download,
  Warning
} from '@mui/icons-material'
import { useState, type FC, useEffect } from 'react'
import pkg from '../../../../../package.json' with { type: 'json' }
import appLogo from '@/assets/logo-cropped.svg'
import { useMainStore } from '@/store/mainStore'

const ipcRenderer = window.electron?.ipcRenderer || false

interface GitHubReleaseInfo {
  tag_name: string // e.g., "v0.2.1"
  html_url: string // Link to the release page
  published_at: string
  name: string // Release title
  body?: string // Release notes / changelog (markdown)
}

const SettingsAbout: FC = () => {
  const versions = ipcRenderer ? window.electron?.process?.versions : null
  const themeChoice = useMainStore((state) => state.ui.themeChoice)

  const [latestVersionInfo, setLatestVersionInfo] = useState<GitHubReleaseInfo | null>(null)
  const [versionCheckLoading, setVersionCheckLoading] = useState(true)
  const [versionCheckError, setVersionCheckError] = useState<string | null>(null)

  const appInfo = {
    name: pkg.productName || pkg.name || 'InputOutput',
    description: pkg.description || 'InputOutput Automation Hub',
    version: pkg.version,
    author: pkg.author,
    license: pkg.license
  }
  const authorName = typeof appInfo.author === 'object' ? appInfo.author.name : appInfo.author
  const repoUrl = `https://github.com/${authorName}/${pkg.name}`
  const techVersions = [
    {
      name: 'Electron',
      version: versions?.electron,
      available: !!ipcRenderer
    },
    { name: 'Chromium', version: versions?.chrome, available: !!ipcRenderer },
    { name: 'Node.js', version: versions?.node, available: !!ipcRenderer },
    { name: 'V8', version: versions?.v8, available: !!ipcRenderer }
  ]

  // react, typescript, mui, zustand
  const techVersions2 = [
    {
      name: 'React',
      version: pkg.devDependencies.react?.replace('^', '') || 'N/A',
      available: true
    },
    {
      name: 'TypeScript',
      version: pkg.devDependencies.typescript?.replace('^', '') || 'N/A',
      available: true
    },
    {
      name: 'MUI',
      version: pkg.dependencies['@mui/material']?.replace('^', '') || 'N/A',
      available: true
    },
    {
      name: 'Zustand',
      version: pkg.dependencies.zustand?.replace('^', '') || 'N/A',
      available: true
    }
  ]

  useEffect(() => {
    const fetchLatestRelease = async () => {
      setVersionCheckLoading(true)
      setVersionCheckError(null)
      try {
        // Ensure authorName and pkg.name are correctly resolved for your repo
        const releaseApiUrl = `https://api.github.com/repos/YeonV/io/releases/latest`
        const response = await fetch(releaseApiUrl)
        if (!response.ok) {
          if (response.status === 404)
            throw new Error('No releases found or repository is private.')
          if (response.status === 403) {
            // Rate limit
            const rateLimitReset = response.headers.get('X-RateLimit-Reset')
            const resetTime = rateLimitReset
              ? new Date(parseInt(rateLimitReset) * 1000).toLocaleTimeString()
              : 'later'
            throw new Error(`GitHub API rate limit exceeded. Please try again ${resetTime}.`)
          }
          throw new Error(`Failed to fetch latest release: ${response.statusText}`)
        }
        const data: GitHubReleaseInfo = await response.json()
        setLatestVersionInfo(data)
      } catch (error: any) {
        console.error('Error fetching latest release:', error)
        setVersionCheckError(error.message || 'Could not check for updates.')
      } finally {
        setVersionCheckLoading(false)
      }
    }

    fetchLatestRelease()
  }, [authorName, pkg.name]) // Dependencies for fetch

  const isUpdateAvailable =
    latestVersionInfo &&
    latestVersionInfo.tag_name.replace(/^v/, '') !== appInfo.version.replace(/^v/, '')

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Stack spacing={3.5}>
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <img
            src={appLogo}
            alt={`${appInfo.name} Logo`}
            style={{
              width: '300px',
              height: 'auto',
              marginBottom: '12px',
              filter: `invert(${themeChoice === 'light' ? 1 : 0})`
            }}
          />
          <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'medium' }}>
            {appInfo.name}
          </Typography>
          <Typography
            variant="body1"
            color="text.disabled"
            gutterBottom
            sx={{ maxWidth: '450px', margin: '0 auto' }}
          >
            {appInfo.description}
          </Typography>
        </Box>
        <Divider />
        {/* Version & Update Check Section */}
        <Box>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 'medium', mb: 1.5, display: 'flex', alignItems: 'center' }}
          >
            <VersionIcon sx={{ mr: 1, opacity: 0.8 }} /> Version & Updates
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                  Application Version:
                  <Chip label={appInfo.version} color="primary" size="small" sx={{ ml: 2 }} />
                </Typography>
                {appInfo.license && (
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 3 }}>
                    <LicenseIcon />
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      License: {appInfo.license}
                    </Typography>
                  </Stack>
                )}
              </Box>

              {/* Update Check Area */}
              <Box>
                {versionCheckLoading && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">
                      Checking for updates...
                    </Typography>
                  </Stack>
                )}
                {versionCheckError && !versionCheckLoading && (
                  <Alert
                    severity="warning"
                    variant="outlined"
                    icon={<Warning fontSize="inherit" />}
                    sx={{ fontSize: '0.8rem', py: 0.5 }}
                  >
                    {versionCheckError}
                  </Alert>
                )}
                {!versionCheckLoading &&
                  !versionCheckError &&
                  latestVersionInfo &&
                  (isUpdateAvailable ? (
                    <Alert
                      severity="success"
                      variant="outlined"
                      icon={<NewReleaseIcon fontSize="inherit" />}
                      action={
                        <Button
                          color="success"
                          size="small"
                          startIcon={<Download />}
                          onClick={() =>
                            ipcRenderer &&
                            ipcRenderer.send('open-link-external', latestVersionInfo.html_url)
                          }
                        >
                          View Update ({latestVersionInfo.tag_name})
                        </Button>
                      }
                      sx={{ fontSize: '0.8rem', py: 0.5, '& .MuiAlert-message': { width: '100%' } }}
                    >
                      New version available: <strong>{latestVersionInfo.tag_name}</strong>
                    </Alert>
                  ) : (
                    <Alert
                      severity="info"
                      variant="outlined"
                      icon={<UpToDateIcon fontSize="inherit" />}
                      sx={{ fontSize: '0.8rem', py: 0.5 }}
                    >
                      You are running the latest version!
                    </Alert>
                  ))}
              </Box>

              {/* Platform Details (Electron Mode) */}
              {ipcRenderer && techVersions.some((v) => v.version) && (
                <Box sx={{ pt: 2 }}>
                  <Typography
                    variant="overline"
                    display="block"
                    sx={{ color: 'text.secondary', mb: 0.5 }}
                  >
                    Platform Details:
                  </Typography>
                  <Grid container spacing={0} sx={{ pl: 0 }}>
                    {techVersions
                      .filter((v) => v.version)
                      .map((item) => (
                        <Grid
                          size={{ xs: 12, sm: 6, md: 3 }}
                          key={item.name}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
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
                    {techVersions2
                      .filter((v) => v.version)
                      .map((item) => (
                        <Grid
                          size={{ xs: 12, sm: 6, md: 3 }}
                          key={item.name}
                          sx={{ whiteSpace: 'nowrap' }}
                        >
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
            </Stack>
          </Paper>
        </Box>
        {/* Developer & Links Section */}
        <Box>
          <Typography
            variant="h6"
            component="div"
            sx={{ fontWeight: 'medium', mb: 1.5, display: 'flex', alignItems: 'center' }}
          >
            <CodeIcon sx={{ mr: 1, opacity: 0.8 }} /> Developer & Links
          </Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
            <Typography
              variant="body1"
              sx={{ mb: 3 }}
              dangerouslySetInnerHTML={{
                __html: `Crafted with ❤️ by <strong>${authorName || 'Blade (YeonV)'}</strong>.`
              }}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button
                variant="outlined"
                startIcon={<GitHubIcon />}
                onClick={() => ipcRenderer && ipcRenderer.send('open-link-external', repoUrl)}
                disabled={!ipcRenderer && !repoUrl.startsWith('http')}
              >
                GitHub Repository
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AboutAppIcon />}
                onClick={() =>
                  ipcRenderer && ipcRenderer.send('open-link-external', `${repoUrl}/issues`)
                }
                disabled={!ipcRenderer && !repoUrl.startsWith('http')}
              >
                Report an Issue
              </Button>
            </Stack>
          </Paper>
        </Box>
        <Box sx={{ flexGrow: 1 }} /> {/* Spacer */}
        <Typography
          variant="caption"
          display="block"
          sx={{ mt: 3, textAlign: 'center', color: 'text.disabled' }}
        >
          © {new Date().getFullYear()} {authorName || 'YeonV aka Blade'}. All rights reserved.
        </Typography>
      </Stack>
    </Paper>
  )
}

export default SettingsAbout
