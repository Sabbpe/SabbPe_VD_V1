import React, { useState } from 'react';
import './BrandDetailsModal.css';

interface Brand {
    id: string;
    brand_name: string;
    brand_code: string;
    brand_type: 'Fixed' | 'Variable';
    category: string;
    description: string;
    brand_image: string;
    discount: number;
    denomination_list: string;
    terms_and_conditions: string;
    redeem_steps: string;
    important_instructions: string;
    images: string;
    channel?: string;
    voucher_bills?: string;
    sub_description?: string;
    validity_days?: number;
}

interface BrandDetailsModalProps {
    brand: Brand;
    isOpen: boolean;
    onClose: () => void;
    onPurchase: (amount: number) => void;
}

type TabType = 'description' | 'redeem' | 'terms' | 'instructions';

export function BrandDetailsModal({ brand, isOpen, onClose, onPurchase }: BrandDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('description');
    
    if (!isOpen) return null;
    
    // Parse JSON fields safely
    const parseJSON = (jsonString: string | null, defaultValue: any = {}) => {
        if (!jsonString) return defaultValue;
        try {
            return JSON.parse(jsonString);
        } catch {
            return defaultValue;
        }
    };
    
    const termsData = parseJSON(brand.terms_and_conditions, { text: '' });
    const imagesData = parseJSON(brand.images, { raw: '' });
    const redeemSteps = parseJSON(brand.redeem_steps, []);
    const instructions = parseJSON(brand.important_instructions, []);
    
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                {/* Close Button */}
                <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                    ×
                </button>
                
                {/* Header */}
                <div className="modal-header">
                    {imagesData.raw && (
                        <img 
                            src={imagesData.raw} 
                            alt={brand.brand_name}
                            className="brand-modal-image"
                        />
                    )}
                    <h2 className="brand-modal-title">{brand.brand_name}</h2>
                    <div className="brand-badges">
                        <span className="badge badge-category">{brand.category}</span>
                        <span className="badge badge-type">{brand.brand_type}</span>
                        {brand.discount > 0 && (
                            <span className="badge badge-discount">{brand.discount}% OFF</span>
                        )}
                        {brand.channel && (
                            <span className="badge badge-channel">{brand.channel}</span>
                        )}
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="modal-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
                        onClick={() => setActiveTab('description')}
                    >
                        Description
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'redeem' ? 'active' : ''}`}
                        onClick={() => setActiveTab('redeem')}
                    >
                        How to Redeem
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
                        onClick={() => setActiveTab('terms')}
                    >
                        Terms & Conditions
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'instructions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('instructions')}
                    >
                        Important Info
                    </button>
                </div>
                
                {/* Tab Content */}
                <div className="modal-body">
                    {/* Description Tab */}
                    {activeTab === 'description' && (
                        <div className="tab-content">
                            <h3>About {brand.brand_name}</h3>
                            <p className="brand-description">{brand.description}</p>
                            
                            {brand.sub_description && (
                                <div className="sub-categories">
                                    <h4>Categories:</h4>
                                    <div className="tag-list">
                                        {brand.sub_description.split(',').map((tag, idx) => (
                                            <span key={idx} className="tag">{tag.trim()}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            <div className="info-grid">
                                {brand.channel && (
                                    <div className="info-card">
                                        <span className="info-label">Channel</span>
                                        <span className="info-value">{brand.channel}</span>
                                    </div>
                                )}
                                {brand.validity_days && (
                                    <div className="info-card">
                                        <span className="info-label">Validity</span>
                                        <span className="info-value">
                                            {brand.validity_days} days (~{Math.round(brand.validity_days/30)} months)
                                        </span>
                                    </div>
                                )}
                                {brand.voucher_bills && (
                                    <div className="info-card">
                                        <span className="info-label">Voucher Type</span>
                                        <span className="info-value">{brand.voucher_bills} voucher(s)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Redeem Steps Tab */}
                    {activeTab === 'redeem' && (
                        <div className="tab-content">
                            <h3>How to Redeem</h3>
                            {redeemSteps.length > 0 ? (
                                <ol className="steps-list">
                                    {redeemSteps.map((step: any, idx: number) => (
                                        <li key={idx} className="step-item">
                                            {step.image && (
                                                <img src={step.image} alt={`Step ${idx + 1}`} className="step-image" />
                                            )}
                                            <p>{step.title || step.text}</p>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="no-content">No redemption instructions available.</p>
                            )}
                        </div>
                    )}
                    
                    {/* Terms Tab */}
                    {activeTab === 'terms' && (
                        <div className="tab-content">
                            <h3>Terms & Conditions</h3>
                            <div className="terms-content">
                                {termsData.text ? (
                                    <div dangerouslySetInnerHTML={{ 
                                        __html: termsData.text.replace(/\\r\\n/g, '<br />').replace(/\n/g, '<br />') 
                                    }} />
                                ) : (
                                    <p className="no-content">No terms and conditions available.</p>
                                )}
                            </div>
                        </div>
                    )}
                    
                    {/* Instructions Tab */}
                    {activeTab === 'instructions' && (
                        <div className="tab-content">
                            <h3>Important Instructions</h3>
                            {instructions.length > 0 ? (
                                <ul className="instructions-list">
                                    {instructions.map((instruction: any, idx: number) => (
                                        <li key={idx} className="instruction-item">
                                            {instruction.image && (
                                                <img src={instruction.image} alt={`Instruction ${idx + 1}`} className="instruction-image" />
                                            )}
                                            <p>{instruction.title || instruction.text}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-content">No special instructions.</p>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Close
                    </button>
                    <button className="btn-primary" onClick={() => {/* Navigate to purchase */}}>
                        Purchase Now
                    </button>
                </div>
            </div>
        </div>
    );
}
