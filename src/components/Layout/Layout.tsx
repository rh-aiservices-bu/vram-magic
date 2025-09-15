import React from 'react'
import { Box, Container, Grid, useTheme, useMediaQuery } from '@mui/material'
import { styled } from '@mui/material/styles'

import Header from './Header'
import Footer from './Footer'

interface LayoutProps {
  children: React.ReactNode
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false
  disableGutters?: boolean
  showFooter?: boolean
  className?: string
}

const LayoutRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
}))

const MainContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  paddingTop: theme.spacing(3),
  paddingBottom: theme.spacing(3),
  [theme.breakpoints.up('md')]: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
}))

const ContentContainer = styled(Container)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  [theme.breakpoints.up('md')]: {
    gap: theme.spacing(4),
  },
}))

const Layout: React.FC<LayoutProps> = ({
  children,
  maxWidth = 'xl',
  disableGutters = false,
  showFooter = true,
  className,
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <LayoutRoot className={className}>
      <Header />

      <MainContent component="main">
        <ContentContainer maxWidth={maxWidth} disableGutters={disableGutters}>
          <Grid container spacing={isMobile ? 2 : 3}>
            <Grid item xs={12}>
              {children}
            </Grid>
          </Grid>
        </ContentContainer>
      </MainContent>

      {showFooter && <Footer />}
    </LayoutRoot>
  )
}

export default React.memo(Layout)
