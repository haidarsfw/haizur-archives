import React from 'react';

// WhatsApp — green circle with phone
function WhatsAppIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="#25D366" />
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.96 7.96 0 01-4.106-1.138L4 20l1.138-3.894A7.96 7.96 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" fill="#25D366" />
        </svg>
    );
}

// Instagram — gradient camera
function InstagramIcon({ size = 16 }) {
    const id = `ig-grad-${size}`;
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <defs>
                <linearGradient id={id} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FEDA77" />
                    <stop offset="25%" stopColor="#F58529" />
                    <stop offset="50%" stopColor="#DD2A7B" />
                    <stop offset="75%" stopColor="#8134AF" />
                    <stop offset="100%" stopColor="#515BD4" />
                </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="6" stroke={`url(#${id})`} strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="4.5" stroke={`url(#${id})`} strokeWidth="2" fill="none" />
            <circle cx="17.5" cy="6.5" r="1.5" fill={`url(#${id})`} />
        </svg>
    );
}

// TikTok — musical note style
function TikTokIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.38a8.16 8.16 0 004.76 1.52V7.48a4.85 4.85 0 01-1-.79z" fill="#fff" />
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.38a8.16 8.16 0 004.76 1.52V7.48a4.85 4.85 0 01-1-.79z" fill="#25F4EE" style={{ transform: 'translate(-1px, -1px)' }} opacity="0.6" />
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.88-2.88 2.89 2.89 0 012.88-2.88c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.38a8.16 8.16 0 004.76 1.52V7.48a4.85 4.85 0 01-1-.79z" fill="#FE2C55" style={{ transform: 'translate(1px, 1px)' }} opacity="0.6" />
        </svg>
    );
}

// iMessage — speech bubble
function IMessageIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.477 2 2 5.813 2 10.5c0 2.71 1.558 5.13 4 6.674V22l4.283-2.354c.556.098 1.13.154 1.717.154 5.523 0 10-3.813 10-8.5S17.523 2 12 2z" fill="#34C759" />
        </svg>
    );
}

// Discord — game controller / Discord logo simplified
function DiscordIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill="#5865F2" />
        </svg>
    );
}

// FaceTime — video camera
function FaceTimeIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <rect x="1" y="5" width="15" height="14" rx="3" fill="#34C759" />
            <path d="M16 10l5-3v10l-5-3v-4z" fill="#34C759" />
        </svg>
    );
}

const ICON_MAP = {
    whatsapp: WhatsAppIcon,
    whatsapp2: WhatsAppIcon,
    instagram: InstagramIcon,
    tiktok: TikTokIcon,
    imessage: IMessageIcon,
    discord: DiscordIcon,
    facetime: FaceTimeIcon,
};

// Small "2nd" badge for secondary accounts
function SecondaryBadge({ size = 16 }) {
    const badgeSize = Math.max(10, size * 0.55);
    const fontSize = Math.max(7, size * 0.35);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: badgeSize, height: badgeSize,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            fontSize, fontWeight: 700,
            color: 'rgba(255,255,255,0.7)',
            marginLeft: -size * 0.15,
            marginBottom: -size * 0.15,
            alignSelf: 'flex-end',
            fontFamily: 'var(--font-mono, monospace)',
            lineHeight: 1,
            letterSpacing: 0,
        }}>
            2
        </span>
    );
}

export { SecondaryBadge };

export default function PlatformIcon({ platform, size = 16, style, isSecondary, showBadge }) {
    const IconComponent = ICON_MAP[platform];
    if (!IconComponent) return null;
    const shouldShowBadge = showBadge || isSecondary || platform === 'whatsapp2';
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0, ...style }}>
            <IconComponent size={size} />
            {shouldShowBadge && <SecondaryBadge size={size} />}
        </span>
    );
}
