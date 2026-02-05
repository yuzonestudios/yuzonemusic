/**
 * Performance optimization utilities for older devices
 */

export const isLowEndDevice = (() => {
    if (typeof window === 'undefined') return false;
    
    // Check hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 2;
    
    // Check device memory (if available)
    const memory = (navigator as any).deviceMemory || 4;
    
    // Check connection type (if available)
    const connection = (navigator as any).connection;
    const slowConnection = connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g';
    
    // Device is considered low-end if it has:
    // - Less than 4 CPU cores
    // - Less than 4GB RAM
    // - Slow network connection
    return cores < 4 || memory < 4 || slowConnection;
})();

export const shouldReduceAnimations = () => {
    if (typeof window === 'undefined') return false;
    
    // Check for user preference
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    return prefersReduced || isLowEndDevice;
};

export const shouldUseBackdropFilter = (() => {
    if (typeof window === 'undefined') return true;
    
    // Check if backdrop-filter is supported
    const supportsBackdrop = CSS.supports('backdrop-filter', 'blur(10px)');
    
    // Only use on capable devices
    return supportsBackdrop && !isLowEndDevice;
})();

export const getOptimalImageQuality = () => {
    return isLowEndDevice ? 60 : 75;
};

export const getOptimalBlurAmount = () => {
    return isLowEndDevice ? 'blur(40px)' : 'blur(60px)';
};

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
