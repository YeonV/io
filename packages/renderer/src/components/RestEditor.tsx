import { useState } from 'react';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import { DialogContent, Input, MenuItem, Select, Stack, TextField } from '@mui/material';



export default function RestEditor() {
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('http://192.168.1.170')

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <div>
            <Button variant="outlined" onClick={handleClickOpen}>
                RestEditor
            </Button>
            <Dialog onClose={handleClose} open={open}>
                <DialogTitle>REST Editor</DialogTitle>
                <DialogContent>
                    <Stack direction={'row'}>
                    <Select
                        variant='outlined'
                        labelId=''
                        label="Method"
                        defaultValue={'GET'}
                        sx={{ '& > div': { paddingTop: 0, paddingBottom: 0 } }}
                    >
                        <MenuItem value={'GET'}>GET</MenuItem>
                        <MenuItem disabled value={'PUT'}>PUT</MenuItem>
                        <MenuItem disabled value={'POST'}>POST</MenuItem>
                        <MenuItem disabled value={'DELETE'}>DELETE</MenuItem>
                    </Select>
                    <TextField style={{ width: '100%' }} value={message} onChange={(e) => setMessage(e.target.value)} />
                    </Stack>
                </DialogContent>
            </Dialog>
        </div>
    );
}
