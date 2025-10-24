// src/services/geo.service.ts
import axios from 'axios';

export async function getGeoData(ip: string) {
    if (!ip || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '127.0.0.1') {
        return null;
    }
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        if (response.data.status === 'success') {
            return {
                city: response.data.city,
                region: response.data.regionName,
                country: response.data.countryCode,
                latitude: response.data.lat,
                longitude: response.data.lon,
            };
        }
        return null;
    } catch (error) {
        console.error('GeoIP lookup failed:', (error as Error).message);
        return null;
    }
}