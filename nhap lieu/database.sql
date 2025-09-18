-- MARK: bảng đơn vị
create table tb_department
(
    -- primary
    id_department bigint not null auto_increment,
    uuid_department varchar(36) not null unique default (UUID()),
    
    -- properties
    name_department text,
    
    -- key
    primary key (id_department),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: bảng vị trí
create table tb_location
(
    -- primary
    id_location bigint not null auto_increment,
    uuid_location varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_department bigint,
    id_external bigint,

    -- properties
    name_location text,
    
    -- key
    primary key (id_location),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: bảng đơn vị đối tác bên ngoài
create table tb_external
(
    -- primary
    id_external bigint not null auto_increment,
    uuid_external varchar(36) not null unique default (UUID()),

    -- properties
    name_external varchar(100),
    phone varchar(10),
    address text,

    -- key
    primary key (id_external),

    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
)

-- MARK: bảng chủng loại máy móc
create table tb_machine_type
(
    -- primary
    id_machine_type bigint not null auto_increment,
    uuid_machine_type varchar(36) not null unique default (UUID()),
    
    -- properties
    code_machine_type varchar(30),
    name_machine_type varchar(100),
    
    -- key
    primary key (id_machine_type),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
)

-- MARK: bảng thông tin máy móc
create table tb_machine
(
    -- primary
    id_machine bigint not null auto_increment,
    uuid_machine varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_machine_type bigint,

    -- properties
    serial_machine varchar(30),
    RFID_machine varchar(30),
    code_machine varchar(30), -- sẽ là mã barcode tham chiếu theo code loại máy
    name_machine varchar(100),
    current_status enum('available', 'in_use', 'maintenance', 'rented_out', 'borrowed_out', 'scrapped') DEFAULT 'available',
    -- các thông tin khác
    
    -- key
    primary key (id_machine),
    unique (id_machine_type),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: bảng thông tin phiếu nhập từ bên ngoài
create table tb_machine_import
(
    -- primary
    id_machine_import bigint not null auto_increment,
    uuid_machine_import varchar(36) not null unique default (UUID()),
    
    -- foreign
    from_location_id bigint,
    to_location_id bigint,

    -- properties
    import_type enum('internal', 'borrowed', 'rented', 'purchased', 'maintenance_return'),
    import_date date,
    -- thông tin mượn từ bên ngoài (mượn thuê khác gì nhau)
    -- thông tin thuê từ bên ngoài
    -- thông tin mua máy từ bên ngoài
    -- thông tin nhập máy đã sửa chửa
    status enum('pending', 'completed', 'cancelled') DEFAULT 'pending', -- trạng thái của phiếu
    note text,

    -- key
    primary key (id_machine_import),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: bảng thông tin chi tiết máy móc nhập vào
create table tb_machine_import_detail
(
    -- primary
    id_machine_import_detail bigint not null auto_increment,
    uuid_machine_import_detail varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_machine_import bigint,
    id_machine bigint,

    -- properties
    note text,
    
    -- key
    primary key (id_machine_import_detail),
    unique (id_machine_import, id_machine),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: bảng thông tin phiếu xuất ra bên ngoài
create table tb_machine_export
(
    -- primary
    id_machine_export bigint not null auto_increment,
    uuid_machine_export varchar(36) not null unique default (UUID()),
    
    -- foreign
    from_location_id bigint,
    to_location_id bigint,
    
    -- properties
    export_type enum('internal', 'maintenance', 'lend_out', 'scrapped'),
    export_date date,
    -- thông tin bảo trì
    -- thông tin cho mượn
    -- thông tin thanh lý
    status enum('pending', 'completed', 'cancelled') DEFAULT 'pending', -- trạng thái của phiếu
    note text,

    -- key
    primary key (id_machine_export),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: bảng thông tin chi tiết máy móc xuất ra
create table tb_machine_export_detail
(
    -- primary
    id_machine_export_detail bigint not null auto_increment,
    uuid_machine_export_detail varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_machine_export bigint,
    id_machine bigint,

    -- properties
    note text,
    
    -- key
    primary key (id_machine_export_detail),
    unique (id_machine_export, id_machine),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: bảng thông tin vị trí máy móc
create table tb_machine_location
(
    -- primary
    id_machine_location bigint not null auto_increment,
    uuid_machine_location varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_machine bigint,
    id_location bigint,

    -- key
    primary key (id_machine_location),
    unique (id_machine, id_location),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);