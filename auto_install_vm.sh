qm stop 200 || true
qm destroy 200 --purge || true
rm -f /etc/pve/qemu-server/200.conf || true

if [ ! -f /root/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -N "" -f /root/.ssh/id_ed25519 -q
fi

qm create 200 --name Coolify-Mestre --memory 24576 --cores 8 --net0 virtio,bridge=vmbr0
qm importdisk 200 /var/lib/vz/template/iso/noble-24.04.img local-lvm
DISK=$(qm config 200 | grep unused0 | awk '{print $2}')
qm set 200 --scsihw virtio-scsi-single --scsi0 $DISK
qm set 200 --ide2 local-lvm:cloudinit
qm set 200 --boot c --bootdisk scsi0
qm set 200 --serial0 socket --vga std
qm set 200 --agent enabled=1
qm set 200 --ipconfig0 ip=dhcp
qm set 200 --ciuser ibav --cipassword IB@Vschool123 --sshkeys /root/.ssh/id_ed25519.pub
qm resize 200 scsi0 150G
qm start 200
