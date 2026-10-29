import BackupScreen from '../../features/screens/BackupScreen';
import { MobileSafeAreaView } from '../../components/mobile/MobileSafeAreaView';

export default function NativeBackupRoute() {
    return (
        <MobileSafeAreaView>
            <BackupScreen mobile />
        </MobileSafeAreaView>
    );
}
