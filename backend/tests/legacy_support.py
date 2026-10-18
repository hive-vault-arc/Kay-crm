"""Insert explicit pre-qualification facts only after an isolated schema downgrade."""

from uuid import UUID, uuid4

from sqlalchemy import text

from app.db.session import Database


def contact(database: Database, actor_id: UUID) -> UUID:
    contact_id = uuid4()
    with database.engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO contact(id,name,type,primary_agent_id,created_by_user_id,source,"
                "version) VALUES(:cid,'Client historique synthétique','person',"
                ":uid,:uid,'manual',1)"
            ),
            {"cid": contact_id, "uid": actor_id},
        )
        connection.execute(
            text(
                "INSERT INTO contact_phone(id,contact_id,origin_contact_id,normalized,"
                "label,is_primary,created_by_user_id) "
                "VALUES(:id,:cid,:cid,'+212600000001','',true,:uid)"
            ),
            {"id": uuid4(), "cid": contact_id, "uid": actor_id},
        )
    return contact_id


def property(database: Database, actor_id: UUID) -> UUID:
    property_id = uuid4()
    with database.engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO property(id,reference,category,created_by_user_id) "
                "VALUES(:pid,'HISTORIQUE-SYNTHETIQUE','land',:uid)"
            ),
            {"pid": property_id, "uid": actor_id},
        )
        connection.execute(
            text(
                "INSERT INTO inventory_event(id,property_id,actor_user_id,actor_display_name,"
                "action,property_version) "
                "VALUES(:id,:pid,:uid,'Auteur historique synthétique','properties.created',1)"
            ),
            {"id": uuid4(), "pid": property_id, "uid": actor_id},
        )
    return property_id


def enquiry(database: Database, actor_id: UUID, contact_id: UUID) -> UUID:
    enquiry_id = uuid4()
    with database.engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO enquiry(id,contact_id,origin_contact_id,message,source,"
                "assigned_agent_id,created_by_user_id,status,version) "
                "VALUES(:id,:cid,:cid,'Demande historique synthétique','manual',:uid,:uid,'new',1)"
            ),
            {"id": enquiry_id, "cid": contact_id, "uid": actor_id},
        )
    return enquiry_id


def deal(
    database: Database, actor_id: UUID, contact_id: UUID, offering_id: UUID | None = None
) -> UUID:
    deal_id = uuid4()
    values = {"id": deal_id, "cid": contact_id, "uid": actor_id, "oid": offering_id}
    with database.engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO deal(id,contact_id,origin_contact_id,offering_id,title,"
                "created_by_user_id,updated_by_user_id) "
                "VALUES(:id,:cid,:cid,:oid,'Affaire historique synthétique',:uid,:uid)"
            ),
            values,
        )
        connection.execute(
            text(
                "INSERT INTO deal_stage_event(id,deal_id,contact_id,actor_user_id,actor_name,"
                "action,to_stage,before_version,after_version,title,next_action,offering_id) "
                "VALUES(:event,:id,:cid,:uid,'Auteur historique synthétique','created','new',0,1,"
                "'Affaire historique synthétique','',:oid)"
            ),
            {**values, "event": uuid4()},
        )
    return deal_id


def available_offering(
    database: Database, actor_id: UUID, contact_id: UUID, property_id: UUID
) -> UUID:
    offering_id = uuid4()
    values = {"oid": offering_id, "pid": property_id, "cid": contact_id, "uid": actor_id}
    with database.engine.begin() as connection:
        connection.execute(
            text(
                "INSERT INTO property_owner(id,property_id,contact_id,origin_contact_id,"
                "created_by_user_id) VALUES(:id,:pid,:cid,:cid,:uid)"
            ),
            {**values, "id": uuid4()},
        )
        connection.execute(
            text(
                "INSERT INTO offering(id,property_id,kind,price_mad,price_period,state,"
                "availability_confirmed_at,created_by_user_id) "
                "VALUES(:oid,:pid,'rental',12000,'month','available',now(),:uid)"
            ),
            values,
        )
        connection.execute(
            text(
                "INSERT INTO inventory_event(id,property_id,offering_id,actor_user_id,"
                "actor_display_name,action,property_version,offering_version,state,price_mad,"
                "price_period) VALUES(:id,:pid,:oid,:uid,'Auteur historique synthétique',"
                "'offerings.created',1,1,'available',12000,'month')"
            ),
            {**values, "id": uuid4()},
        )
    return offering_id
