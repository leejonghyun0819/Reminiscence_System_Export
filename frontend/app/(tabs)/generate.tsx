import GenerateScreen from '../../features/screens/GenerateScreen';
import { MobileSafeAreaView } from '../../components/mobile/MobileSafeAreaView';

export default function NativeGenerateRoute() {
    return (
        <MobileSafeAreaView>
            <GenerateScreen mobile />
        </MobileSafeAreaView>
    );
}
