import React from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material'
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Memory as VRAMIcon,
  GitHub as GitHubIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import { styled } from '@mui/material/styles'

import { useUIContext } from '../../hooks/useUIContext'

interface HeaderProps {
  showNavigation?: boolean
  className?: string
}

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  position: 'static',
  background:
    theme.palette.mode === 'light'
      ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
      : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.grey[900]} 100%)`,
  backdropFilter: 'blur(20px)',
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow:
    theme.palette.mode === 'light'
      ? '0 4px 20px rgba(0, 0, 0, 0.1)'
      : '0 4px 20px rgba(0, 0, 0, 0.3)',
}))

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  minHeight: 64,
  padding: theme.spacing(0, 2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(0, 3),
  },
  [theme.breakpoints.up('md')]: {
    minHeight: 72,
    padding: theme.spacing(0, 4),
  },
}))

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  flexGrow: 1,
}))

const ActionContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  [theme.breakpoints.up('sm')]: {
    gap: theme.spacing(1),
  },
}))

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  color: theme.palette.mode === 'light' ? 'white' : theme.palette.text.primary,
  transition: theme.transitions.create(['transform', 'background-color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    transform: 'scale(1.1)',
    backgroundColor:
      theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}))

const Header: React.FC<HeaderProps> = ({ className }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  const { isDarkMode, toggleTheme, addNotification } = useUIContext()

  const handleThemeToggle = () => {
    toggleTheme()
    addNotification({
      type: 'success',
      message: `Switched to ${isDarkMode ? 'light' : 'dark'} mode`,
      autoClose: true,
    })
  }

  const handleInfoClick = () => {
    addNotification({
      type: 'info',
      message: 'VRAM Magic helps calculate GPU memory requirements for LLM deployments',
      autoClose: true,
    })
  }

  const handleGitHubClick = () => {
    window.open('https://github.com/your-org/vram-magic', '_blank', 'noopener,noreferrer')
  }

  return (
    <StyledAppBar className={className} elevation={0}>
      <StyledToolbar>
        <LogoContainer>
          <VRAMIcon
            sx={{
              fontSize: isMobile ? 28 : 32,
              color: theme.palette.mode === 'light' ? 'white' : theme.palette.primary.main,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
            }}
          />
          <Box>
            <Typography
              variant={isMobile ? 'h5' : 'h4'}
              component="h1"
              sx={{
                fontWeight: 700,
                color: theme.palette.mode === 'light' ? 'white' : theme.palette.text.primary,
                textShadow: theme.palette.mode === 'light' ? '0 2px 4px rgba(0,0,0,0.3)' : 'none',
                letterSpacing: '-0.025em',
              }}
            >
              VRAM Magic
            </Typography>
            {!isMobile && (
              <Typography
                variant="caption"
                sx={{
                  color:
                    theme.palette.mode === 'light'
                      ? 'rgba(255, 255, 255, 0.8)'
                      : theme.palette.text.secondary,
                  textShadow: theme.palette.mode === 'light' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                  display: 'block',
                  lineHeight: 1,
                  marginTop: -0.5,
                }}
              >
                GPU Memory Calculator
              </Typography>
            )}
          </Box>
        </LogoContainer>

        <ActionContainer>
          {!isTablet && (
            <Tooltip title="About VRAM Magic" arrow>
              <StyledIconButton
                onClick={handleInfoClick}
                size="medium"
                aria-label="About VRAM Magic"
              >
                <InfoIcon />
              </StyledIconButton>
            </Tooltip>
          )}

          {!isTablet && (
            <Tooltip title="View on GitHub" arrow>
              <StyledIconButton
                onClick={handleGitHubClick}
                size="medium"
                aria-label="View source code on GitHub"
              >
                <GitHubIcon />
              </StyledIconButton>
            </Tooltip>
          )}

          <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`} arrow>
            <StyledIconButton
              onClick={handleThemeToggle}
              size="medium"
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              <Fade in={true} timeout={300}>
                <Box>{isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}</Box>
              </Fade>
            </StyledIconButton>
          </Tooltip>
        </ActionContainer>
      </StyledToolbar>
    </StyledAppBar>
  )
}

export default React.memo(Header)
