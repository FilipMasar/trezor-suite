import { closeModal } from '@suite/modal';
import { type Account } from '@suite-common/wallet-types';
import { Modal } from '@trezor/components';

import { useDispatch } from 'src/hooks/suite';

import { PolygonStakingForm } from './PolygonStakingForm';

type Props = {
    account: Account;
    onCancel: () => void;
};

export const PolygonStakeModal = ({ account, onCancel }: Props) => {
    const dispatch = useDispatch();

    const close = () => dispatch(closeModal());

    return (
        <Modal heading="Stake POL" onCancel={onCancel} width={480}>
            <PolygonStakingForm account={account} onSuccess={close} />
        </Modal>
    );
};
