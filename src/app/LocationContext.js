/**
 * Current user location shared with components deep in the tree (maps)
 * without passing it through every screen.
 */
import { createContext } from 'react';
import { DEFAULT_LOCATION } from '@/services/geolocation.js';

export const LocationContext = createContext(DEFAULT_LOCATION);
