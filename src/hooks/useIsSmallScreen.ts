import { useMediaQuery } from "usehooks-ts";

export const useIsSmallScreen = () => {
    return useMediaQuery('(max-width: 768px)');
};
