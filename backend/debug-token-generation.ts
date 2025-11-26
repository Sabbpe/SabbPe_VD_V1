// Debug version of token generation
import axios from 'axios';

const VD_CONFIG = {
    baseUrl: 'http://cards.vdwebapi.com/distributor',
    distributorId: 'VDIDSabbPe',
    apiUsername: '25F65B0D6B154A458357CF8330EC695D',
    apiPassword: 'uHMu:@=w5A7228BD6F9F4D67AEA0A013',
};

async function debugTokenGeneration() {
    console.log('🔍 Starting token generation debug...\n');

    try {
        console.log('📝 Configuration:');
        console.log(`   Base URL: ${VD_CONFIG.baseUrl}`);
        console.log(`   Distributor ID: ${VD_CONFIG.distributorId}`);
        console.log(`   API Username: ${VD_CONFIG.apiUsername.substring(0, 10)}...`);
        console.log(`   API Password: ${VD_CONFIG.apiPassword.substring(0, 10)}...\n`);

        console.log('📤 Sending token request...');
        console.log(`   URL: ${VD_CONFIG.baseUrl}/api-generatetoken/`);
        console.log('   Method: POST');
        console.log('   Body:', { distributor_id: VD_CONFIG.distributorId });
        console.log('   Headers:');
        console.log(`     - Content-Type: application/json`);
        console.log(`     - username: ${VD_CONFIG.apiUsername.substring(0, 10)}...`);
        console.log(`     - password: ${VD_CONFIG.apiPassword.substring(0, 10)}...\n`);

        const response = await axios.post(
            `${VD_CONFIG.baseUrl}/api-generatetoken/`,
            { distributor_id: VD_CONFIG.distributorId },
            {
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'username': VD_CONFIG.apiUsername,
                    'password': VD_CONFIG.apiPassword,
                },
                validateStatus: () => true, // Don't throw on any status
            }
        );

        console.log('📥 Response received:');
        console.log(`   Status: ${response.status} ${response.statusText}`);
        console.log(`   Full response:`, JSON.stringify(response.data, null, 2));

        if (response.data.status === 'SUCCESS' && response.data.token) {
            console.log('\n✅ TOKEN GENERATION SUCCESSFUL!');
            console.log(`   Token: ${response.data.token.substring(0, 20)}...`);
            console.log(`   Expiry: ${response.data.expiry_date}`);
        } else {
            console.log('\n❌ TOKEN GENERATION FAILED');
            console.log(`   Status: ${response.data.status}`);
            console.log(`   Message: ${response.data.responseMsg || response.data.statusmessage}`);
        }
    } catch (error) {
        console.log('\n❌ ERROR DURING TOKEN GENERATION:');
        if (axios.isAxiosError(error)) {
            console.log(`   Status: ${error.response?.status}`);
            console.log(`   URL: ${error.config?.url}`);
            console.log(`   Message: ${error.message}`);
            console.log(`   Response:`, error.response?.data);
        } else {
            console.log(`   ${error}`);
        }
    }
}

// Run debug
debugTokenGeneration();