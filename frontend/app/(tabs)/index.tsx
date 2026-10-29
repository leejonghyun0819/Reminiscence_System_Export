import IndexScreen from '../../features/screens/IndexScreen';
import { MobileSafeAreaView } from '../../components/mobile/MobileSafeAreaView';

export default function NativeIndexRoute() {
    return (
        <MobileSafeAreaView>
            <IndexScreen mobile />
        </MobileSafeAreaView>
    );
}
