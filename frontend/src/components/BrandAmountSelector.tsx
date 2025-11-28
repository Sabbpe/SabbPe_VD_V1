import React, { useState } from 'react';

interface BrandAmountSelectorProps {
    brandType: 'Fixed' | 'Variable';
    denominationList: string;
    onAmountSelect: (amount: number) => void;
}

export function BrandAmountSelector({ 
    brandType, 
    denominationList, 
    onAmountSelect 
}: BrandAmountSelectorProps) {
    const [customAmount, setCustomAmount] = useState('');
    const [error, setError] = useState('');
    
    // Parse range for variable type (e.g., "500-5000")
    const getAmountRange = () => {
        if (brandType === 'Variable' && denominationList) {
            const [min, max] = denominationList.split('-').map(n => parseInt(n.trim()));
            return { min, max };
        }
        return null;
    };
    
    const range = getAmountRange();
    
    const handleCustomAmountChange = (value: string) => {
        setCustomAmount(value);
        setError('');
        
        if (range && value) {
            const amount = parseInt(value);
            if (isNaN(amount)) {
                setError('Please enter a valid number');
            } else if (amount < range.min) {
                setError(`Minimum amount is ₹${range.min.toLocaleString()}`);
            } else if (amount > range.max) {
                setError(`Maximum amount is ₹${range.max.toLocaleString()}`);
            } else {
                onAmountSelect(amount);
            }
        }
    };
    
    // Fixed type - show buttons
    if (brandType === 'Fixed') {
        const amounts = denominationList.split(',').map(a => parseInt(a.trim()));
        
        return (
            <div className="amount-buttons-grid">
                {amounts.map((amount) => (
                    <button
                        key={amount}
                        onClick={() => onAmountSelect(amount)}
                        className="amount-btn"
                    >
                        ₹{amount.toLocaleString()}
                    </button>
                ))}
            </div>
        );
    }
    
    // Variable type - show text input
    return (
        <div className="amount-input-container">
            <label htmlFor="custom-amount" className="amount-label">
                Enter Amount
            </label>
            <div className="input-wrapper">
                <span className="currency-symbol">₹</span>
                <input
                    id="custom-amount"
                    type="number"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder={range ? `${range.min} - ${range.max}` : 'Enter amount'}
                    min={range?.min}
                    max={range?.max}
                    className={`amount-input ${error ? 'error' : ''}`}
                />
            </div>
            {error && <p className="error-message">{error}</p>}
            {range && !error && (
                <p className="hint-text">
                    Valid range: ₹{range.min.toLocaleString()} - ₹{range.max.toLocaleString()}
                </p>
            )}
        </div>
    );
}
