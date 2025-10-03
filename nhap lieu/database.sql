-- MARK: permission phân quyền
create table if not exists tb_permission
(
    -- primary
    id_permission bigint not null auto_increment,
    uuid_permission varchar(36) not null unique default (UUID()),
    
    -- properties
    name_permission text,

    -- key
    primary key (id_permission),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: role phân quyền
create table if not exists tb_user_permission
(
    -- primary
    id_user_permission bigint not null auto_increment,
    uuid_user_permission varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_permission bigint,

    -- key
    primary key (id_user_permission),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: department đơn vị
create table if not exists tb_department
(
    -- primary
    id_department bigint not null auto_increment,
    uuid_department varchar(36) not null unique default (UUID()),
    
    -- properties
    name_department text,
    id_phong_ban bigint, -- sync data hi time sheet
    
    -- key
    primary key (id_department),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: location vị trí
create table if not exists tb_location
(
    -- primary
    id_location bigint not null auto_increment,
    uuid_location varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_department bigint,

    -- properties
    name_location text,
    
    -- key
    primary key (id_location),
    unique (id_location, id_department),

    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: category loại vật tư
create table if not exists tb_category
(
    -- primary
    id_category bigint not null auto_increment,
    uuid_category varchar(36) not null unique default (UUID()),
    
    -- properties
    name_category text,
    
    -- key
    primary key (id_category),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: machine máy móc
create table if not exists tb_machine
(
    -- primary
    id_machine bigint not null auto_increment,
    uuid_machine varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_category bigint,

    -- properties
    serial_machine varchar(30),
    RFID_machine varchar(30),
    code_machine varchar(30), -- sẽ là mã barcode tham chiếu theo code loại máy
    name_machine text,
    manufacturer text, -- hãng sản xuất
    price decimal(15, 0), -- giá
    date_of_use date, -- ngày sử dụng
    lifespan int, -- tuổi thọ
    repair_cost decimal(15, 0), -- chi phí sửa chữa
    note text,
    current_status enum('available', 'in_use', 'maintenance', 'rented_out', 'borrowed_out', 'scrapped', 'disabled') default 'available',
    
    -- key
    primary key (id_machine),
    unique (id_machine, id_category),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: import thông tin phiếu nhập từ bên ngoài
create table if not exists tb_machine_import
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
    status enum('pending', 'completed', 'cancelled') default 'pending', -- trạng thái của phiếu
    note text,

    -- key
    primary key (id_machine_import),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: import details thông tin chi tiết máy móc nhập vào
create table if not exists tb_machine_import_detail
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
    unique (id_machine_import_detail, id_machine_import, id_machine),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: export thông tin phiếu xuất ra bên ngoài
create table if not exists tb_machine_export
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
    status enum('pending', 'completed', 'cancelled') default 'pending', -- trạng thái của phiếu
    note text,

    -- key
    primary key (id_machine_export),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: export details thông tin chi tiết máy móc xuất ra
create table if not exists tb_machine_export_detail
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
    unique (id_machine_export_detail, id_machine_export, id_machine),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: machine location thông tin vị trí máy móc
create table if not exists tb_machine_location
(
    -- primary
    id_machine_location bigint not null auto_increment,
    uuid_machine_location varchar(36) not null unique default (UUID()),
    
    -- foreign
    id_machine bigint,
    id_location bigint,

    -- key
    primary key (id_machine_location),
    unique (id_machine_location, id_machine, id_location),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: machine location history thông tin lịch sử vị trí máy móc
create table if not exists tb_machine_location_history
(
    id_machine_location_history bigint not null auto_increment,
    uuid_machine_location_history varchar(36) not null unique default (UUID()),

    -- foreign
    id_machine bigint,
    id_from_location bigint,
    id_to_location bigint,

    -- properties
    move_date date,

    -- key
    primary key (id_machine_location_history),
    unique (id_machine_location_history, id_machine, id_from_location, id_to_location),

    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: alert thông tin cảnh báo máy móc
create table if not exists tb_machine_alert
(
    -- primary
    id_machine_alert bigint not null auto_increment,
    uuid_machine_alert varchar(36) not null unique default (UUID()),

    -- foreign
    id_machine bigint,

    -- properties
    alert_type enum('return_due', 'maintenance_due', 'rental_expiry', 'borrow_expiry', 'custom'),
    alert_date date,

    -- key
    primary key (id_machine_alert),
    unique (id_machine_alert, id_machine),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: request thông tin yêu cầu máy móc
create table if not exists tb_machine_request
(
    -- primary
    id_machine_request bigint not null auto_increment,
    uuid_machine_request varchar(36) not null unique default (UUID()),

    -- foreign
    id_location bigint,

    -- properties
    production_code varchar(30), -- mã hàng
    request_date date, -- ngày đặt
    delivery_date date, -- ngày giao
    inline_date date, -- ngày vào chuyền
    pic varchar(30), -- người phụ trách
    technical varchar(30), -- cơ điện
    status enum('pending', 'completed', 'cancelled') default 'pending',
    note text,

    -- key
    primary key (id_machine_request),
    unique (id_machine_request, id_location),

    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: request details thông tin chi tiết yêu cầu máy móc
create table if not exists tb_machine_request_detail
(
    -- primary
    id_machine_request_detail bigint not null auto_increment,
    uuid_machine_request_detail varchar(36) not null unique default (UUID()),

    -- foreign
    id_machine_request bigint,
    id_machine bigint,

    -- properties
    quantity int,
    note text,
    -- từ từ làm còn các thông tin khác cần làm rõ

    -- key
    primary key (id_machine_request_detail),
    unique (id_machine_request_detail, id_machine_request, id_machine),
    
    -- timestamp
    created_at timestamp default current_timestamp,
    created_by bigint default '0',
    updated_at timestamp default current_timestamp on update current_timestamp,
    updated_by bigint default '0'
);

-- MARK: insert data
insert into tb_category (name_category) values ('Máy móc thiết bị'), ('Phụ kiện');

insert into tb_department (name_department, id_phong_ban) values 
('Bộ phận cơ điện', 14), 
('Xưởng 1', 10),
('Xưởng 2', 30),
('Xưởng 3', 24),
('Xưởng 4', 31),
('Phòng kỹ thuật', 28),
('Xưởng cắt', 57),
('Kho nguyên phụ liệu', 3202),
('Đơn vị bên ngoài', null);

insert into tb_location (name_location, id_department) values
('Kho cơ điện', 1),
('Chuyền 1', 2),
('Chuyền 2', 2),
('Chuyền 3', 2),
('Chuyền 4', 2),
('Chuyền 5', 2),
('Chuyền 6', 2),
('Chuyền 7', 2),
('Chuyền 8', 2),
('Chuyền 9', 2),
('Chuyền 10', 2),
('Chuyền 10.01', 2),
('Chuyền chuyên dùng - Xưởng 1', 2),
('Chuyền 11', 3),
('Chuyền 12', 3),
('Chuyền 20.01', 3),
('Chuyền 13', 3),
('Chuyền 14', 3),
('Chuyền 15', 3),
('Chuyền 16', 3),
('Chuyền 17', 3),
('Chuyền 18', 3),
('Chuyền 19', 3),
('Chuyền 20', 3),
('Chuyền hoàn thành - Xưởng 2', 3),
('Chuyền chuyên dùng - Xưởng 2', 3),
('Chuyền 21', 4),
('Chuyền 22', 4),
('Chuyền 23', 4),
('Chuyền 24', 4),
('Chuyền 25', 4),
('Chuyền 26', 4),
('Chuyền 27', 4),
('Chuyền 28', 4),
('Chuyền 29', 4),
('Chuyền 30', 4),
('Chuyền chuyên dùng - Xưởng 3', 4),
('Chuyền 31', 5),
('Chuyền 32', 5),
('Chuyền 33', 5),
('Chuyền 34', 5),
('Chuyền 35', 5),
('Chuyền 36', 5),
('Chuyền 37', 5),
('Chuyền 38', 5),
('Chuyền 39', 5),
('Chuyền 40', 5),
('Chuyền chuyên dùng - Xưởng 4', 5),
('Chuyền hoàn thành 1 - Xưởng 4', 5),
('Chuyền hoàn thành 2 - Xưởng 4', 5),
('Công ty A', 6),
('Công ty B', 6),
('Công ty C', 6);