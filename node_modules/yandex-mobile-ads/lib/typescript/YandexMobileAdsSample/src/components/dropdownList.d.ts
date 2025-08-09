import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import AdNetwork from '../common/adNetworkUtils/adNetwork';
interface DropdownListProps {
    adNetworks: AdNetwork[];
    setAdNetwork: (value: AdNetwork | undefined) => void;
    style?: StyleProp<ViewStyle>;
}
declare const DropdownList: React.FC<DropdownListProps>;
export default DropdownList;
//# sourceMappingURL=dropdownList.d.ts.map