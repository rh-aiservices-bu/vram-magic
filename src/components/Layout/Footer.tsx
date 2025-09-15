import React from 'react'
import {
  Box,
  Container,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
  Button,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import {
  GitHub as GitHubIcon,
  Description as DocsIcon,
  BugReport as BugIcon,
  Code as CodeIcon,
} from '@mui/icons-material'

interface FooterProps {
  className?: string
}

const FooterRoot = styled(Box)(({ theme }) => ({
  backgroundColor:
    theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  marginTop: 'auto',
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
}))

const FooterContent = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}))

const LinkSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(3),
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  [theme.breakpoints.up('sm')]: {
    justifyContent: 'flex-start',
  },
}))

const CopyrightSection = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  alignItems: 'center',
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
}))

const TechStack = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'center',
  [theme.breakpoints.up('sm')]: {
    justifyContent: 'flex-end',
  },
}))

const Footer: React.FC<FooterProps> = ({ className }) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const currentYear = new Date().getFullYear()

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <FooterRoot className={className}>
      <FooterContent maxWidth="xl">
        <LinkSection>
          <Button
            variant="text"
            startIcon={<GitHubIcon />}
            onClick={() => handleLinkClick('https://github.com/your-org/vram-magic')}
            aria-label="View source code on GitHub"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              textTransform: 'none',
              minWidth: 'auto',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            Source Code
          </Button>

          <Button
            variant="text"
            startIcon={<DocsIcon />}
            onClick={() => handleLinkClick('https://docs.vram-magic.com')}
            aria-label="View documentation"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              textTransform: 'none',
              minWidth: 'auto',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            Documentation
          </Button>

          <Button
            variant="text"
            startIcon={<BugIcon />}
            onClick={() => handleLinkClick('https://github.com/your-org/vram-magic/issues')}
            aria-label="Report issues"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              textTransform: 'none',
              minWidth: 'auto',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            Report Issues
          </Button>

          <Button
            variant="text"
            startIcon={<CodeIcon />}
            onClick={() => handleLinkClick('https://api.vram-magic.com')}
            aria-label="API documentation"
            sx={{
              color: 'text.secondary',
              fontSize: '0.875rem',
              textTransform: 'none',
              minWidth: 'auto',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'transparent',
              },
            }}
          >
            API
          </Button>
        </LinkSection>

        <Divider />

        <CopyrightSection>
          <Box sx={{ textAlign: isMobile ? 'center' : 'left' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              VRAM Magic {currentYear}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', lineHeight: 1.2 }}
            >
              GPU Memory Calculator for LLM Deployments
            </Typography>
          </Box>

          <TechStack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mr: 1, display: isMobile ? 'none' : 'block' }}
            >
              Built with:
            </Typography>

            <Chip
              label="React 18"
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.6875rem',
                height: 20,
                '& .MuiChip-label': { px: 1 },
              }}
            />

            <Chip
              label="TypeScript"
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.6875rem',
                height: 20,
                '& .MuiChip-label': { px: 1 },
              }}
            />

            <Chip
              label="Material UI"
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.6875rem',
                height: 20,
                '& .MuiChip-label': { px: 1 },
              }}
            />

            {!isMobile && (
              <>
                <Chip
                  label="Recharts"
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.6875rem',
                    height: 20,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />

                <Chip
                  label="Vite"
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.6875rem',
                    height: 20,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </>
            )}
          </TechStack>
        </CopyrightSection>
      </FooterContent>
    </FooterRoot>
  )
}

export default React.memo(Footer)
