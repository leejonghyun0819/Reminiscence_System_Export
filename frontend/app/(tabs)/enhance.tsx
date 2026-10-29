import EnhanceScreen from '../../features/screens/EnhanceScreen';
import { MobileSafeAreaView } from '../../components/mobile/MobileSafeAreaView';

export default function NativeEnhanceRoute() {
    return (
        <MobileSafeAreaView>
            <EnhanceScreen mobile />
        </MobileSafeAreaView>
    );
}
