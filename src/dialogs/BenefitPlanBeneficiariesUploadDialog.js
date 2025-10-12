/* eslint-disable max-len */
/* eslint-disable react/jsx-one-expression-per-line */
/* eslint-disable react/jsx-no-useless-fragment */
import React, { useEffect, useState } from 'react';
import {
  Input, Grid, MenuItem, Typography, Select, CircularProgress, Backdrop, Snackbar, Fade,
} from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';
import { injectIntl } from 'react-intl';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  apiHeaders,
  baseApiUrl,
  formatMessage,
  coreAlert,
  FormattedMessage,
} from '@openimis/fe-core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import WorkflowsPicker from '../pickers/WorkflowsPicker';
import { fetchWorkflows } from '../actions';
import {
  BENEFIT_PLAN_TYPE, EMPTY_STRING, MODULE_NAME, PYTHON_DEFAULT_IMPORT_WORKFLOW,
} from '../constants';
import downloadTemplate from '../util/export';

const styles = (theme) => ({
  item: theme.paper.item,
  backdrop: {
    zIndex: theme.zIndex.drawer + 2,
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
});

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

function BenefitPlanBeneficiariesUploadDialog({
  intl,
  classes,
  workflows,
  fetchWorkflows,
  benefitPlan,
  coreAlert,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [forms, setForms] = useState({});
  const [headers, setHeaders] = useState([]);
  const [groupAggregationHeader, setGroupAggregationHeader] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setForms({});
    setHeaders([]);
    setGroupAggregationHeader(null);
    setIsOpen(false);
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const isBenefitPlanGroupType = () => benefitPlan.type === BENEFIT_PLAN_TYPE.GROUP;

  const getHeadersFromCSV = async (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvData = event.target.result;
      const firstLine = csvData.substring(0, csvData.indexOf('\n'));
      const headersList = firstLine.split(',');
      if (headersList.length && !headersList.some((item) => !item)) headersList.unshift('');
      resolve(headersList);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });

  const handleFileInputChange = async (selectedFile) => {
    if (selectedFile) {
      try {
        const fileHeaders = await getHeadersFromCSV(selectedFile);
        const filteredHeaders = fileHeaders.filter(
          (header) => header !== 'recipient_info' && header !== 'group_id',
        );
        setHeaders(filteredHeaders);
      } catch (error) {
        setHeaders([]);
      }
    }
  };

  const handleFieldChange = async (formName, fieldName, value) => {
    if (fieldName === 'file') await handleFileInputChange(value);
    setForms({
      ...forms,
      [formName]: {
        ...(forms[formName] ?? {}),
        [fieldName]: value,
      },
    });
  };

  const getFieldValue = () => forms?.workflows?.workflow?.name ?? {};

  const downloadExampleTemplate = (benefitPlanId) => {
    downloadTemplate(benefitPlanId);
  };

  const onSubmit = async (values) => {
    const { file } = values;
    const fileFormat = file ? file.type : undefined;

    if (
      !fileFormat
      || (!fileFormat.includes('/csv')
        && !fileFormat.includes('application/vnd.ms-excel')
        && !fileFormat.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))
    ) {
      coreAlert(
        formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.upload.alert.header.invalid_format'),
        formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.upload.alert.message.invalid_format'),
      );
      return;
    }

    const formData = new FormData();
    formData.append('file', values.file);

    let urlImport;
    if (
      fileFormat.includes('/csv')
      || fileFormat.includes('application/vnd.ms-excel')
      || fileFormat.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ) {
      formData.append('benefit_plan', benefitPlan.id);
      formData.append('workflow_name', values.workflow.name);
      formData.append('workflow_group', values.workflow.group);
      if (groupAggregationHeader) formData.append('group_aggregation_column', groupAggregationHeader);
      urlImport = `${baseApiUrl}/social_protection/import_beneficiaries/`;
    }

    try {
      setSaving(true);
      const response = await fetch(urlImport, {
        headers: apiHeaders,
        body: formData,
        method: 'POST',
        credentials: 'same-origin',
      });

      if (response.ok) {
        setSaving(false);
        setSnackbarMessage('Importation réussie !');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        handleClose();
        return;
      }

      const errorHeader = formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.alert.header');
      const errorMessage = response.status === 409
        ? formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.alert.sameFileName')
        : EMPTY_STRING;

      setSaving(false);
      coreAlert(errorHeader, errorMessage);
      setSnackbarMessage('Erreur lors de l’importation.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } catch (error) {
      setSaving(false);
      handleClose();
      setSnackbarMessage('Une erreur est survenue.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outlined"
        color="#DFEDEF"
        className={classes.button}
        style={{
          border: '0px',
          marginTop: '6px',
        }}
      >
        {formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.upload')}
      </Button>

      {/* === DIALOG UPLOAD === */}
      <Dialog
        open={isOpen}
        onClose={handleClose}
        PaperProps={{
          style: { width: 600, maxWidth: 1000 },
        }}
      >
        <form noValidate>
          <DialogTitle style={{ marginTop: '10px' }}>
            {formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.upload.label')}
          </DialogTitle>
          <DialogContent>
            <div style={{ backgroundColor: '#DFEDEF', paddingLeft: '10px', paddingBottom: '10px' }}>
              <Grid item>
                <Grid container spacing={4} direction="column">
                  <Grid item>
                    <Input
                      onChange={(event) => handleFieldChange('workflows', 'file', event.target.files[0])}
                      required
                      id="import-button"
                      inputProps={{
                        accept: '.csv, application/csv, text/csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, .xls, .xlsx',
                      }}
                      type="file"
                    />
                  </Grid>
                  <Grid item>
                    <WorkflowsPicker
                      module="socialProtection"
                      label="workflowPicker"
                      onChange={(value) => handleFieldChange('workflows', 'workflow', value)}
                      value={() => getFieldValue()}
                      workflows={workflows}
                      required
                    />
                  </Grid>
                </Grid>

                {getFieldValue() === PYTHON_DEFAULT_IMPORT_WORKFLOW && isBenefitPlanGroupType() ? (
                  <Grid container direction="row" alignItems="center">
                    <Grid container spacing={4} direction="row" alignItems="center">
                      <Grid item>
                        <Typography>
                          <FormattedMessage module={MODULE_NAME} id="createGroupFromColumns" />
                        </Typography>
                      </Grid>
                      <Grid item md={5}>
                        <Select
                          id="select"
                          value={groupAggregationHeader}
                          onChange={(v) => setGroupAggregationHeader(v.target.value)}
                          fullWidth
                        >
                          {headers.map((header, index) => (
                            // eslint-disable-next-line react/no-array-index-key
                            <MenuItem key={index} value={header}>
                              {header}
                            </MenuItem>
                          ))}
                        </Select>
                      </Grid>
                    </Grid>
                    <Grid spacing={4} item>
                      <Typography style={{ fontSize: '12px' }}>
                        * <FormattedMessage module={MODULE_NAME} id="groupAggregationInfo" />
                      </Typography>
                    </Grid>
                  </Grid>
                ) : null}
              </Grid>
            </div>
          </DialogContent>

          <DialogActions style={{ display: 'inline', paddingLeft: '10px', marginTop: '25px', marginBottom: '15px' }}>
            <div style={{ maxWidth: '1000px' }}>
              <div style={{ float: 'left' }}>
                <Button
                  onClick={handleClose}
                  variant="outlined"
                  autoFocus
                  style={{ margin: '0 16px', marginBottom: '15px' }}
                >
                  Cancel
                </Button>
              </div>
              <div style={{ float: 'right', paddingRight: '16px' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => downloadExampleTemplate(benefitPlan.id)}
                  style={{ marginRight: '8px' }}
                >
                  {formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.template')}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => onSubmit(forms.workflows)}
                  disabled={!(forms.workflows?.file && forms.workflows?.workflow) || saving}
                >
                  {saving ? <CircularProgress size={22} color="inherit" /> : formatMessage(intl, 'socialProtection', 'benefitPlan.benefitPlanBeneficiaries.upload.label')}
                </Button>
              </div>
            </div>
          </DialogActions>
        </form>
      </Dialog>

      {/* === BACKDROP LOADING === */}
      <Fade in={saving} timeout={{ enter: 300, exit: 300 }}>
        <Backdrop className={classes.backdrop} open={saving}>
          <CircularProgress color="inherit" />
          <Typography variant="subtitle1">Importation en cours...</Typography>
        </Backdrop>
      </Fade>

      {/* === SNACKBAR NOTIFICATION === */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights ?? [],
  confirmed: state.core.confirmed,
  workflows: state.socialProtection.workflows,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
  fetchWorkflows,
  coreAlert,
}, dispatch);

export default injectIntl(
  withTheme(
    withStyles(styles)(
      connect(mapStateToProps, mapDispatchToProps)(BenefitPlanBeneficiariesUploadDialog),
    ),
  ),
);
