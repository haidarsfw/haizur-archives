import React from "react";
import PresencePill from "./PresencePill";

// Thin wrapper. The widget used to render a large fixed card at z-50 that
// blocked the theme toggle. All of that is now owned by PresencePill.
export default function PartnerStatus({ partnerPresence, currentRole, isMobile }) {
    return (
        <PresencePill
            partnerPresence={partnerPresence}
            currentRole={currentRole}
            isMobile={isMobile}
        />
    );
}
