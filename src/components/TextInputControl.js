import React from 'react'
import { FormGroup, FormControl, InputLabel, Input } from "@material-ui/core"

const TextInputControl = ({ label, value, onSetValue, readOnly = false, disabled = false, type = "text" }) => {
    const formGroupStyle = {
        paddingTop: 25
    };
    return (
        <FormGroup style={formGroupStyle}>
            <FormControl>
                <InputLabel>{label}</InputLabel>
                <Input
                    readOnly={readOnly}
                    disabled={disabled}
                    type={type}
                    value={value}
                    onChange={(event) => { onSetValue && onSetValue(event.target.value); }}
                />
            </FormControl>
        </FormGroup>
    );
}

export default TextInputControl