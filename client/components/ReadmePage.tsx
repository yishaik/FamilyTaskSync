import { useTranslation } from 'react-i18next';
import { Box, Container, Typography, Paper } from '@mui/material';

export const ReadmePage = () => {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, my: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          {t('readme.title')}
        </Typography>
        
        <Box sx={{ whiteSpace: 'pre-line' }}>
          <Typography variant="h4" gutterBottom>
            {t('readme.features.title')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('readme.features.notifications')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('readme.features.reminders')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('readme.features.family')}
          </Typography>
          
          <Typography variant="h4" gutterBottom>
            {t('readme.getStarted.title')}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('readme.getStarted.steps')}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};
